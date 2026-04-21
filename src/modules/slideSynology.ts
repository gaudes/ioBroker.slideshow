import { GlobalHelper } from "./global-helper";
import axios, { AxiosError } from "axios";
import { wrapper } from "axios-cookiejar-support"
import { CookieJar } from "tough-cookie";

import * as path from "path";

export interface SynoPicture {
	url: string,
	path: string,
	info1: string,
	info2: string,
	info3: string,
	date: Date | null,
	x: number,
	y: number,
	apiNamespace: string,
	cacheKey: string,
	passphrase?: string,
	album: string
}

export interface SynoPictureListUpdateResult {
	success: boolean;
	picturecount: number;
}

export interface SynoAlbum {
	id: number;
	name: string;
	space: "personal" | "shared-with-me" | "team";
	passphrase: string;
	apiNamespace: string;
}

// Internal use for iterating folders
interface SynoFolders {
	id: number,
	name: string,
	parent: number
}
const synoFolders: SynoFolders[] = [];

// Connection State for internal use
let synoConnectionState = false;
// Synology Login Token
let synoToken = "";
// Authentication Cookie
const AxiosJar = new CookieJar();
// Axios instance with options
const synoConnection = wrapper(axios.create({
	withCredentials: true,
	jar: AxiosJar,
	timeout: 30000
}));
// Add CSRF token header to every request (required by Synology Photos)
synoConnection.interceptors.request.use(config => {
	if (synoToken) {
		config.headers["X-SYNO-TOKEN"] = synoToken;
	}
	return config;
});

let CurrentImages: SynoPicture[];
let CurrentImage: SynoPicture;
let CurrentPicture: SynoPicture;
// Direction used when CurrentPicture was prefetched. When a caller asks for a
// different direction, the cached prefetch is stale and must be discarded.
let PrefetchDirection: 1 | -1 = 1;

// Cache for discovered Photo API URL (declared early so getPicturePrefetch can read it)
let cachedPhotoApiUrl = "";

/**
 * Build base URL from syno_path config, auto-detecting protocol.
 * If the user provides "https://..." or "http://...", use as-is.
 * Otherwise prepend "http://".
 */
function getBaseUrl(synoPath: string): string {
	if (synoPath.startsWith("http://") || synoPath.startsWith("https://")) {
		return synoPath.replace(/\/+$/, "");
	}
	return `http://${synoPath}`;
}

/**
 * Convert a Synology timestamp to a Date object.
 * Synology APIs return Unix timestamps in seconds, but we guard
 * against millisecond values as well.
 */
function synoTimestampToDate(time: number): Date {
	if (time > 1e12) {
		return new Date(time);
	}
	return new Date(time * 1000);
}

export async function getPicture(Helper: GlobalHelper, direction: 1 | -1 = 1): Promise<SynoPicture | null> {
	try {
		// Invalidate prefetch if the caller wants a different direction than
		// what the cached prefetch advanced toward.
		if (CurrentPicture && direction !== PrefetchDirection) {
			CurrentPicture = undefined as unknown as SynoPicture;
		}
		if (!CurrentPicture) {
			await getPicturePrefetch(Helper, direction);
		}
		const CurrentPictureResult = CurrentPicture;
		// Speculatively prefetch the next picture in the same direction so the
		// following call returns immediately.
		getPicturePrefetch(Helper, direction);
		return CurrentPictureResult;
	} catch (err) {
		Helper.ReportingError(err as Error, "Unknown Error", "Synology", "getPicture");
		return null;
	}
}

export async function getPicturePrefetch(Helper: GlobalHelper, direction: 1 | -1 = 1): Promise<void> {
	// Select Image from list
	try {
		if (CurrentImages.length !== 0) {
			if (!CurrentImage) {
				CurrentImage = CurrentImages[0];
			} else {
				const idx = CurrentImages.indexOf(CurrentImage);
				if (idx === -1) {
					CurrentImage = CurrentImages[0];
				} else {
					const len = CurrentImages.length;
					const nextIdx = (idx + direction + len) % len;
					CurrentImage = CurrentImages[nextIdx];
				}
			}
			PrefetchDirection = direction;
		}
	} catch (err) {
		Helper.ReportingError(err as Error, "Unknown Error", "Synology", "getPicturePrefetch/Select");
	}
	// Retrieve Image
	try {
		await loginSyno(Helper);
		const baseUrl = getBaseUrl(Helper.Adapter.config.syno_path);
		let synURL = "";
		if (Helper.Adapter.config.syno_version === 0) {
			// DSM 7 — Synology Photos
			const apiNs = CurrentImage.apiNamespace || "SYNO.FotoTeam";
			const photoApiUrl = cachedPhotoApiUrl || `${baseUrl}/photo/webapi/entry.cgi`;
			// Use cache_key for download (required by Synology Photos API)
			if (CurrentImage.cacheKey) {
				// Use Thumbnail API with xl size (1280px) for better performance
				synURL = `${photoApiUrl}?api=${apiNs}.Thumbnail&method=get&version=1&id=${CurrentImage.path}&cache_key=${encodeURIComponent(CurrentImage.cacheKey)}&type=unit&size=xl&SynoToken=${synoToken}`;
			} else {
				// Fallback to download API without cache_key
				synURL = `${photoApiUrl}?api=${apiNs}.Download&method=download&version=1&unit_id=%5B${CurrentImage.path}%5D&force_download=true&SynoToken=${synoToken}`;
			}
			if (CurrentImage.passphrase) {
				synURL += `&passphrase=${encodeURIComponent(CurrentImage.passphrase)}`;
			}
		} else {
			// DSM 6 — PhotoStation
			synURL = `${baseUrl}/photo/webapi/download.php?api=SYNO.PhotoStation.Download&method=getphoto&version=1&id=${CurrentImage.path}&download=true`;
		}
		Helper.ReportingInfo("Debug", "Synology", `Downloading picture ${CurrentImage.info3} (ID ${CurrentImage.path}, cacheKey: ${CurrentImage.cacheKey || "none"})`);
		const synResult = await synoConnection.get<any>(synURL, { responseType: "arraybuffer" });
		await Helper.Adapter.writeFileAsync(Helper.Adapter.namespace, "synology_current.jpg", synResult.data);
		CurrentPicture = { ...CurrentImage, url: `/${Helper.Adapter.namespace}/synology_current.jpg?t=${Date.now()}` };
	} catch (err) {
		if ((err as AxiosError).response?.status === 502) {
			Helper.ReportingError(err as Error, `Unknown Error downloading Picture ${CurrentImage.path}`, "Synology", "getPicturePrefetch/Retrieve", "", false);
		} else {
			Helper.ReportingError(err as Error, "Unknown Error", "Synology", "getPicturePrefetch/Retrieve");
		}
	}
}

export async function updatePictureList(Helper: GlobalHelper): Promise<SynoPictureListUpdateResult> {
	CurrentImages = [];
	await loginSyno(Helper);
	if (synoConnectionState !== true) {
		return { success: false, picturecount: 0 };
	}

	const CurrentImageList: SynoPicture[] = [];

	// Retrieve complete list of pictures
	try {
		if (Helper.Adapter.config.syno_version === 0) {
			// DSM 7 — Synology Photos
			const configuredAlbums: string[] = Array.isArray(Helper.Adapter.config.syno_albums)
				? Helper.Adapter.config.syno_albums.map(n => (n || "").trim()).filter(n => n.length > 0)
				: [];
			const legacyAlbum = Helper.Adapter.config.syno_album?.trim() || "";
			if (configuredAlbums.length > 0) {
				await getDsm7MultiAlbumItems(Helper, configuredAlbums, CurrentImageList);
			} else if (legacyAlbum) {
				await getDsm7AlbumItems(Helper, legacyAlbum, CurrentImageList);
			} else {
				// Fallback: iterate all folders in shared space
				await getDsm7FolderItems(Helper, CurrentImageList);
			}
		} else {
			// DSM 6 — PhotoStation
			await getDsm6Items(Helper, CurrentImageList);
		}
		Helper.ReportingInfo("Debug", "Synology", `${CurrentImageList.length} pictures found before filtering`);
	} catch (err) {
		Helper.ReportingError(err as Error, "Unknown Error", "Synology", "updatePictureList/List");
		return { success: false, picturecount: 0 };
	}

	// Filter pictures
	try {
		// Filter for JPEG, JPG and PNG files
		const CurrentImageListFilter1 = CurrentImageList.filter(function (element) {
			const ext = path.extname(element.info3).toLowerCase();
			return ext === ".jpg" || ext === ".jpeg" || ext === ".png";
		});
		// Filter for orientation (1 = landscape, 2 = portrait, 0 = all)
		if (Helper.Adapter.config.syno_format === 1) {
			CurrentImages = CurrentImageListFilter1.filter(element => element.x > element.y);
		} else if (Helper.Adapter.config.syno_format === 2) {
			CurrentImages = CurrentImageListFilter1.filter(element => element.y > element.x);
		} else {
			CurrentImages = CurrentImageListFilter1;
		}
		Helper.ReportingInfo("Debug", "Synology", `${CurrentImages.length} pictures after orientation filter (syno_format=${Helper.Adapter.config.syno_format})`);
		// Sorting
		switch (Helper.Adapter.config.syno_order) {
			case 0:
				// Takendate
				CurrentImages = await sortByKey(CurrentImages, "date");
				break;
			case 1:
				// Filename
				CurrentImages = await sortByKey(CurrentImages, "info3");
				break;
			case 3:
				// Random
				// See https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
				let currentIndex = CurrentImages.length, temporaryValue: SynoPicture, randomIndex: number;
				// While there remain elements to shuffle...
				while (0 !== currentIndex) {
					// Pick a remaining element...
					randomIndex = Math.floor(Math.random() * currentIndex);
					currentIndex -= 1;
					// And swap it with the current element.
					temporaryValue = CurrentImages[currentIndex];
					CurrentImages[currentIndex] = CurrentImages[randomIndex];
					CurrentImages[randomIndex] = temporaryValue;
				}
		}
	} catch (err) {
		Helper.ReportingError(err as Error, "Unknown Error", "Synology", "updatePictureList/Filter");
		return { success: false, picturecount: 0 };
	}
	// Images found ?
	if (!(CurrentImages.length > 0)) {
		Helper.ReportingError(null, "No pictures found", "Synology", "updatePictureList", "", false);
		return { success: false, picturecount: 0 };
	} else {
		Helper.ReportingInfo("Info", "Synology", `${CurrentImages.length} pictures found`, { JSON: JSON.stringify(CurrentImages.slice(0, 99)) });
		return { success: true, picturecount: CurrentImages.length };
	}
}

/**
 * Discover available Synology Photos APIs and cache the API URL.
 * Tries multiple endpoints since some setups use /webapi/ and others /photo/webapi/
 */
async function discoverPhotoApiUrl(Helper: GlobalHelper, baseUrl: string): Promise<string | null> {
	if (cachedPhotoApiUrl) return cachedPhotoApiUrl;

	// Try multiple possible API endpoints
	const endpoints = [
		`${baseUrl}/webapi/entry.cgi`,        // Works on many DSM 7 setups
		`${baseUrl}/photo/webapi/entry.cgi`,  // Alternative path
	];

	for (const url of endpoints) {
		try {
			Helper.ReportingInfo("Debug", "Synology", `Trying Photo API at ${url}`);
			// Query ALL available APIs to see what's there
			const result = await synoConnection.get<any>(url, {
				params: {
					api: "SYNO.API.Info",
					method: "query",
					version: 1,
					query: "all",
					SynoToken: synoToken
				}
			});
			if (result.data?.success === true) {
				const allApis = Object.keys(result.data.data || {}).sort();
				// Filter for Photo-related APIs
				const photoApis = allApis.filter(a => a.includes("Foto") || a.includes("Photo") || a.includes("Sharing"));
				Helper.ReportingInfo("Info", "Synology", `Photo API found at ${url}`);
				Helper.ReportingInfo("Debug", "Synology", `Available Photo APIs (${photoApis.length}): ${photoApis.join(", ")}`);
				cachedPhotoApiUrl = url;
				return url;
			}
			Helper.ReportingInfo("Debug", "Synology", `Photo API query at ${url} failed: ${JSON.stringify(result.data)}`);
		} catch (err) {
			Helper.ReportingInfo("Debug", "Synology", `Cannot reach Photo API at ${url}: ${(err as AxiosError).response?.status || (err as Error).message}`);
		}
	}

	Helper.Adapter.log.error(`Could not find Synology Photos API endpoint. Tried: ${endpoints.join(", ")}`);
	return null;
}

/**
 * DSM 7: List all albums across personal, shared-with-me, and team space.
 */
async function listAllAlbums(Helper: GlobalHelper, apiUrl: string): Promise<SynoAlbum[]> {
	const phases: Array<{ label: SynoAlbum["space"]; api: string; extraParams: Record<string, any> }> = [
		{ label: "personal", api: "SYNO.Foto.Browse.Album", extraParams: {} },
		{ label: "shared-with-me", api: "SYNO.Foto.Sharing.Misc", extraParams: { method: "list_shared_with_me_album", version: 1 } },
		{ label: "team", api: "SYNO.FotoTeam.Browse.Album", extraParams: {} },
	];
	const result: SynoAlbum[] = [];

	for (const phase of phases) {
		let offset = 0;
		while (true) {
			let synResult: any;
			try {
				synResult = await synoConnection.get<any>(apiUrl, {
					params: {
						api: phase.api,
						method: "list",
						version: 2,
						offset,
						limit: 100,
						SynoToken: synoToken,
						...phase.extraParams,
					},
				});
			} catch (err) {
				Helper.ReportingInfo("Debug", "Synology", `Could not list albums in ${phase.label}: ${(err as Error).message}`);
				break;
			}
			if (synResult.data?.success !== true || !Array.isArray(synResult.data?.data?.list)) {
				Helper.ReportingInfo("Debug", "Synology", `No albums accessible in ${phase.label}: ${JSON.stringify(synResult.data)}`);
				break;
			}
			const albums = synResult.data.data.list;
			if (albums.length === 0) break;

			for (const a of albums) {
				result.push({
					id: a.id,
					name: a.name || "",
					space: phase.label,
					passphrase: a.passphrase || "",
					apiNamespace: phase.api.startsWith("SYNO.FotoTeam") ? "SYNO.FotoTeam" : "SYNO.Foto",
				});
			}

			if (albums.length < 100) break;
			offset += 100;
		}
	}

	Helper.ReportingInfo("Debug", "Synology", `listAllAlbums: ${result.length} albums found across all spaces`);
	return result;
}

/**
 * DSM 7: Fetch items for a specific resolved album into the image list.
 */
async function fetchAlbumItems(Helper: GlobalHelper, apiUrl: string, album: SynoAlbum, imageList: SynoPicture[]): Promise<void> {
	const itemApiNs = album.apiNamespace;
	let itemOffset = 0;
	while (true) {
		const params: any = {
			api: `${itemApiNs}.Browse.Item`,
			method: "list",
			version: 1,
			offset: itemOffset,
			limit: 500,
			additional: JSON.stringify(["description", "resolution", "orientation", "tag", "thumbnail"]),
			SynoToken: synoToken,
		};
		if (album.passphrase) {
			params.passphrase = album.passphrase;
		} else {
			params.album_id = album.id;
		}

		const synResult = await synoConnection.get<any>(apiUrl, { params });
		if (synResult.data?.success !== true || !Array.isArray(synResult.data?.data?.list)) {
			Helper.ReportingError(null, `Error getting pictures from album "${album.name}". Synology returned: ${JSON.stringify(synResult.data)}`, "Synology", "fetchAlbumItems", "", false);
			return;
		}
		const items = synResult.data.data.list;
		if (items.length === 0) break;

		Helper.ReportingInfo("Debug", "Synology", `Album "${album.name}": ${items.length} items at offset ${itemOffset}`);
		for (const element of items) {
			let PictureDate: Date | null = null;
			if (element.time) {
				PictureDate = synoTimestampToDate(element.time);
			}
			const cacheKey = element.additional?.thumbnail?.cache_key || "";
			imageList.push({
				path: String(element.id),
				url: "",
				info1: element.description || "",
				info2: "",
				info3: element.filename || "",
				date: PictureDate,
				x: element.additional?.resolution?.width || 0,
				y: element.additional?.resolution?.height || 0,
				apiNamespace: itemApiNs,
				cacheKey,
				passphrase: album.passphrase || "",
				album: album.name,
			});
		}
		itemOffset += 500;
	}
}

/**
 * Public: drop the cached session so the next call reauthenticates against Synology.
 * Used by the admin reload button so newly shared albums aren't hidden behind a cached list.
 */
export function invalidateSession(): void {
	synoConnectionState = false;
	synoToken = "";
	cachedPhotoApiUrl = "";
	AxiosJar.removeAllCookiesSync();
}

/**
 * Public: log in, discover API, and list all albums (used by main.ts / admin message handler).
 */
export async function getAlbumList(Helper: GlobalHelper): Promise<SynoAlbum[]> {
	try {
		if (Helper.Adapter.config.syno_version !== 0) return [];
		await loginSyno(Helper);
		if (synoConnectionState !== true) return [];
		const baseUrl = getBaseUrl(Helper.Adapter.config.syno_path);
		const apiUrl = await discoverPhotoApiUrl(Helper, baseUrl);
		if (!apiUrl) return [];
		return await listAllAlbums(Helper, apiUrl);
	} catch (err) {
		Helper.ReportingError(err as Error, "Unknown error", "Synology", "getAlbumList");
		return [];
	}
}

/**
 * DSM 7: Find an album by name in personal, shared-with-me, and team space, then list its items.
 */
async function getDsm7AlbumItems(Helper: GlobalHelper, albumName: string, imageList: SynoPicture[]): Promise<void> {
	const baseUrl = getBaseUrl(Helper.Adapter.config.syno_path);
	const apiUrl = await discoverPhotoApiUrl(Helper, baseUrl);
	if (!apiUrl) {
		Helper.ReportingError(null, "Could not find Synology Photos API endpoint", "Synology", "getDsm7AlbumItems", "", false);
		return;
	}

	const allAlbums = await listAllAlbums(Helper, apiUrl);
	let album = allAlbums.find(a => a.name === albumName);
	if (!album) {
		const lower = albumName.toLowerCase();
		album = allAlbums.find(a => a.name.toLowerCase() === lower);
		if (album) {
			Helper.ReportingInfo("Info", "Synology", `Album name case mismatch: configured "${albumName}", found "${album.name}". Using found album.`);
		}
	}
	if (!album) {
		const available = allAlbums.length > 0
			? `Available albums: ${allAlbums.map(a => `"${a.name}" (${a.space})`).join(", ")}`
			: "No albums were found in any space.";
		Helper.ReportingError(null, `Album "${albumName}" not found. ${available}`, "Synology", "getDsm7AlbumItems", "", false);
		return;
	}

	Helper.ReportingInfo("Info", "Synology", `Found album "${album.name}" (id ${album.id}, ${album.space})`);
	await fetchAlbumItems(Helper, apiUrl, album, imageList);
}

/**
 * DSM 7: Fetch items from multiple selected albums and aggregate them.
 */
async function getDsm7MultiAlbumItems(Helper: GlobalHelper, albumNames: string[], imageList: SynoPicture[]): Promise<void> {
	const baseUrl = getBaseUrl(Helper.Adapter.config.syno_path);
	const apiUrl = await discoverPhotoApiUrl(Helper, baseUrl);
	if (!apiUrl) {
		Helper.ReportingError(null, "Could not find Synology Photos API endpoint", "Synology", "getDsm7MultiAlbumItems", "", false);
		return;
	}

	const allAlbums = await listAllAlbums(Helper, apiUrl);
	const wanted = new Set(albumNames.map(n => (n || "").trim()).filter(n => n.length > 0));
	const matched = allAlbums.filter(a => wanted.has(a.name));
	const missing = [...wanted].filter(name => !matched.find(a => a.name === name));
	if (missing.length > 0) {
		Helper.ReportingInfo("Info", "Synology", `Multi-album: ${missing.length} configured album(s) not found: ${missing.join(", ")}`);
	}
	Helper.ReportingInfo("Info", "Synology", `Multi-album: fetching items from ${matched.length}/${wanted.size} albums`);

	for (const album of matched) {
		await fetchAlbumItems(Helper, apiUrl, album, imageList);
	}
}

/**
 * DSM 7: Get items by iterating folders in shared space (legacy/fallback behavior).
 */
async function getDsm7FolderItems(Helper: GlobalHelper, imageList: SynoPicture[]): Promise<void> {
	const baseUrl = getBaseUrl(Helper.Adapter.config.syno_path);
	const photoApiUrl = cachedPhotoApiUrl || `${baseUrl}/photo/webapi/entry.cgi`;

	Helper.ReportingInfo("Debug", "Synology", "Start iterating folders (no album configured)");
	synoFolders.length = 0;
	await synoGetFolders(Helper, 1);
	Helper.ReportingInfo("Debug", "Synology", `${synoFolders.length} folders found, receiving pictures`);

	for (const synoFolder of synoFolders) {
		Helper.ReportingInfo("Debug", "Synology", `Getting pictures of folder ID ${synoFolder.id} (${synoFolder.name})`);
		let synEndOfFiles = false;
		let synOffset = 0;
		while (synEndOfFiles === false) {
			// Include "thumbnail" in additional to get cache_key for download
			const synURL = `${photoApiUrl}?api=SYNO.FotoTeam.Browse.Item&method=list&version=1&limit=500&item_type=%5B0%5D&additional=%5B%22description%22%2C%22orientation%22%2C%22tag%22%2C%22resolution%22%2C%22thumbnail%22%5D&offset=${synOffset}&SynoToken=${synoToken}&folder_id=${synoFolder.id}`;
			const synResult = await (synoConnection.get<any>(synURL));
			if (synResult.data["success"] === true && Array.isArray(synResult.data["data"]["list"])) {
				if (synResult.data["data"]["list"].length === 0) {
					synEndOfFiles = true;
				} else {
					Helper.ReportingInfo("Debug", "Synology", `Folder ${synoFolder.id} has ${synResult.data["data"]["list"].length} pictures`);
					synResult.data["data"]["list"].forEach((element: any) => {
						let PictureDate: Date | null = null;
						if (element.time) {
							PictureDate = synoTimestampToDate(element.time);
						}
						// Extract cache_key from thumbnail additional data (required for download)
						const cacheKey = element.additional?.thumbnail?.cache_key || "";
						imageList.push({ path: String(element.id), url: "", info1: element.description || "", info2: "", info3: element.filename || "", date: PictureDate, x: element.additional?.resolution?.width || 0, y: element.additional?.resolution?.height || 0, apiNamespace: "SYNO.FotoTeam", cacheKey: cacheKey, album: synoFolder.name || ""});
					});
					synOffset = synOffset + 500;
				}
			} else {
				Helper.ReportingError(null, "Error getting pictures from Synology", "Synology", "getDsm7FolderItems", JSON.stringify(synResult.data), false);
				return;
			}
		}
	}
}

/**
 * DSM 6: Get items from PhotoStation.
 */
async function getDsm6Items(Helper: GlobalHelper, imageList: SynoPicture[]): Promise<void> {
	const baseUrl = getBaseUrl(Helper.Adapter.config.syno_path);

	let synEndOfFiles = false;
	let synOffset = 0;
	while (synEndOfFiles === false) {
		const synURL = `${baseUrl}/photo/webapi/photo.php?api=SYNO.PhotoStation.Photo&method=list&version=1&limit=500&type=photo&offset=${synOffset}`;
		const synResult = await (synoConnection.get<any>(synURL));
		if (synResult.data["success"] === true && Array.isArray(synResult.data["data"]["items"])) {
			synResult.data["data"]["items"].forEach((element: any) => {
				let PictureDate: Date | null = null;
				if (element.info.takendate) {
					PictureDate = new Date(element.info.takendate);
				}
				// DSM6 doesn't use cache_key - leave empty
				imageList.push({ path: element.id, url: "", info1: element.info.title, info2: element.info.description, info3: element.info.name, date: PictureDate, x: element.info.resolutionx, y: element.info.resolutiony, apiNamespace: "", cacheKey: "", album: Helper.Adapter.config.syno_album || "" });
			});
			if (synResult.data["data"]["total"] === synResult.data["data"]["offset"]) {
				synEndOfFiles = true;
			} else {
				synOffset = synResult.data["data"]["offset"];
			}
		} else {
			Helper.ReportingError(null, "Error getting pictures from Synology", "Synology", "getDsm6Items", JSON.stringify(synResult.data), false);
			return;
		}
	}
}

async function loginSyno(Helper: GlobalHelper): Promise<boolean> {
	// Check parameters
	try {
		if (Helper.Adapter.config.syno_path === "" || Helper.Adapter.config.syno_path === null) {
			Helper.Adapter.log.error("No name or IP address of Synology configured");
			return false;
		}
		if (Helper.Adapter.config.syno_username === "" || Helper.Adapter.config.syno_username === null) {
			Helper.Adapter.log.error("No username for Synology configured");
			return false;
		}
		if (Helper.Adapter.config.syno_userpass === "" || Helper.Adapter.config.syno_userpass === null) {
			Helper.Adapter.log.error("No password for Synology configured");
			return false;
		}
	} catch (err) {
		Helper.ReportingError(err as Error, "Unknown error", "Synology", "loginSyno/CheckParameters");
		synoConnectionState = false;
		return false;
	}
	// Run connection check
	if (await synoCheckConnection(Helper) === true) {
		return true;
	} else {
		// Run Login
		try {
			const baseUrl = getBaseUrl(Helper.Adapter.config.syno_path);
			Helper.ReportingInfo("Debug", "Synology", `Login attempt to baseUrl: ${baseUrl}, user: ${Helper.Adapter.config.syno_username}, version: ${Helper.Adapter.config.syno_version}`);

			if (Helper.Adapter.config.syno_version === 0) {
				// DSM 7 — Synology Photos
				// Try multiple endpoint/method combinations
				const loginAttempts = [
					// Original working method: /webapi/entry.cgi with version 6 (NOT /photo/webapi!)
					{ url: `${baseUrl}/webapi/entry.cgi`, method: "GET", version: "6" },
					// Fallback endpoints
					{ url: `${baseUrl}/photo/webapi/entry.cgi`, method: "GET", version: "6" },
					{ url: `${baseUrl}/webapi/auth.cgi`, method: "GET", version: "6" },
					{ url: `${baseUrl}/photo/webapi/auth.cgi`, method: "GET", version: "3" },
				];

				let loginSuccess = false;
				let lastError = "";

				for (const attempt of loginAttempts) {
					Helper.ReportingInfo("Debug", "Synology", `Trying ${attempt.method} login at ${attempt.url} (API version ${attempt.version})`);

					try {
						let synResult: any;

						if (attempt.method === "GET") {
							// GET request with query parameters (original method)
							synResult = await synoConnection.get<any>(attempt.url, {
								params: {
									api: "SYNO.API.Auth",
									version: attempt.version,
									method: "login",
									account: Helper.Adapter.config.syno_username,
									passwd: Helper.Adapter.config.syno_userpass,
									enable_syno_token: "yes"
								}
							});
						} else {
							// POST request with form data
							const formData = new URLSearchParams();
							formData.append("api", "SYNO.API.Auth");
							formData.append("version", attempt.version);
							formData.append("method", "login");
							formData.append("account", Helper.Adapter.config.syno_username);
							formData.append("passwd", Helper.Adapter.config.syno_userpass);
							formData.append("enable_syno_token", "yes");

							synResult = await synoConnection.post<any>(attempt.url, formData, {
								headers: { "Content-Type": "application/x-www-form-urlencoded" }
							});
						}

						Helper.ReportingInfo("Debug", "Synology", `Login response: ${JSON.stringify(synResult.data)}`);

						if (synResult.data?.success === true) {
							const sid = synResult.data.data?.sid;
							synoToken = synResult.data.data?.synotoken || "";
							cachedPhotoApiUrl = ""; // Reset API URL cache on new login
							synoConnectionState = true;
							Helper.ReportingInfo("Info", "Synology", `Synology Photos login successful via ${attempt.method} ${attempt.url} (sid: ${sid ? "received" : "none"}, synotoken: ${synoToken ? "received" : "none"})`);
							loginSuccess = true;
							break;
						} else {
							const errorCode = synResult.data?.error?.code;
							lastError = `error code ${errorCode}`;
							Helper.ReportingInfo("Debug", "Synology", `Login failed: error code ${errorCode}, full response: ${JSON.stringify(synResult.data)}`);

							// Error codes: 400=invalid params, 401=account disabled, 402=permission denied, 403=2FA required, 404=2FA failed
							if (errorCode === 403) {
								Helper.Adapter.log.error("Synology login failed: 2-Factor Authentication is enabled. Please disable 2FA for the ioBroker user or use an app-specific password.");
								synoConnectionState = false;
								return false;
							}
							if (errorCode === 401) {
								Helper.Adapter.log.error("Synology login failed: Account disabled or wrong credentials");
								synoConnectionState = false;
								return false;
							}
						}
					} catch (endpointErr) {
						const axErr = endpointErr as AxiosError;
						const status = axErr.response?.status;
						const responseData = axErr.response?.data;
						lastError = `HTTP ${status || axErr.code || axErr.message}`;
						Helper.ReportingInfo("Debug", "Synology", `Login endpoint failed: ${lastError}, response: ${JSON.stringify(responseData)}`);
					}
				}

				if (loginSuccess) {
					return true;
				} else {
					Helper.Adapter.log.error(`Connection failure to Synology Photos: All login attempts failed. Last error: ${lastError}`);
					synoConnectionState = false;
					return false;
				}
			} else {
				// DSM 6 — PhotoStation
				const synResult = await (synoConnection.get<any>(`${baseUrl}/photo/webapi/auth.php?api=SYNO.PhotoStation.Auth&method=login&version=1&username=${Helper.Adapter.config.syno_username}&password=${encodeURIComponent(Helper.Adapter.config.syno_userpass)}`));
				Helper.ReportingInfo("Debug", "Synology", "Synology DSM 6 login result", { result: synResult });
				if (synResult.data && synResult.data["data"] && synResult.data["data"]["username"] === Helper.Adapter.config.syno_username) {
					synoConnectionState = true;
					Helper.ReportingInfo("Info", "Synology", "Synology DSM 6 login successful");
					return true;
				} else {
					Helper.Adapter.log.error("Connection failure to Synology PhotoStation");
					synoConnectionState = false;
					return false;
				}
			}
		} catch (err) {
			const axiosErr = err as AxiosError;
			if (axiosErr.response?.status === 403) {
				Helper.Adapter.log.error("Synology login denied (403 Forbidden). Possible causes: 1) Wrong credentials, 2) Account locked (too many failed attempts), 3) IP blocked by Synology firewall, 4) 2FA enabled on account");
				synoConnectionState = false;
				return false;
			} else if (axiosErr.code === "ECONNREFUSED") {
				Helper.Adapter.log.error(`Cannot connect to Synology at ${Helper.Adapter.config.syno_path}: Connection refused. Check if the NAS is reachable and the port is correct.`);
				synoConnectionState = false;
				return false;
			} else if (axiosErr.code === "ENOTFOUND") {
				Helper.Adapter.log.error(`Cannot connect to Synology: Host not found. Check the hostname/IP address: ${Helper.Adapter.config.syno_path}`);
				synoConnectionState = false;
				return false;
			} else if (axiosErr.code === "ETIMEDOUT" || axiosErr.code === "ECONNABORTED") {
				Helper.Adapter.log.error(`Connection to Synology timed out. Check if the NAS is reachable: ${Helper.Adapter.config.syno_path}`);
				synoConnectionState = false;
				return false;
			} else if (axiosErr.isAxiosError === true) {
				Helper.Adapter.log.error(`No connection to Synology: ${axiosErr.message} (${axiosErr.code || "no code"})`);
				synoConnectionState = false;
				return false;
			} else {
				Helper.ReportingError(err as Error, "Unknown error", "Synology", "loginSyno/Login");
				synoConnectionState = false;
				return false;
			}
		}
	}
}

async function synoCheckConnection(Helper: GlobalHelper): Promise<boolean> {
	// No token yet — force fresh login
	if (!synoToken) {
		return false;
	}
	try {
		const baseUrl = getBaseUrl(Helper.Adapter.config.syno_path);
		if (Helper.Adapter.config.syno_version === 0) {
			// DSM 7 — verify session via API info query
			const photoApiUrl = cachedPhotoApiUrl || `${baseUrl}/photo/webapi/entry.cgi`;
			const synResult = await synoConnection.get<any>(photoApiUrl, {
				params: {
					api: "SYNO.Foto.Browse.Album",
					method: "list",
					version: 2,
					limit: 1,
					offset: 0,
					SynoToken: synoToken
				}
			});
			if (synResult.data?.success === true) {
				synoConnectionState = true;
				return true;
			} else {
				synoConnectionState = false;
			}
		} else {
			// DSM 6
			const synoURL = `${baseUrl}/photo/webapi/auth.php?api=SYNO.PhotoStation.Auth&method=checkauth&version=1`;
			const synResult = await (synoConnection.get<any>(synoURL));
			if (synResult.status === 200) {
				if (synResult.data.data?.username === Helper.Adapter.config.syno_username) {
					synoConnectionState = true;
					return true;
				} else {
					synoConnectionState = false;
				}
			} else {
				synoConnectionState = false;
			}
		}
	} catch (err) {
		if ((err as AxiosError).response?.status === 403) {
			synoConnectionState = false;
			return false;
		} else if ((err as AxiosError).isAxiosError === true) {
			Helper.Adapter.log.error(`No connection to Synology: ${(err as AxiosError).message}`);
			synoConnectionState = false;
			return false;
		} else {
			Helper.ReportingError(err as Error, "Unknown error", "Synology", "synoCheckConnection");
			synoConnectionState = false;
			return false;
		}
	}
	return false;
}

async function synoGetFolders(Helper: GlobalHelper, FolderID: number): Promise<boolean> {
	try {
		const baseUrl = getBaseUrl(Helper.Adapter.config.syno_path);
		const photoApiUrl = cachedPhotoApiUrl || `${baseUrl}/photo/webapi/entry.cgi`;
		let synoEndOfFolders = false;
		let synoOffset = 0;
		while (synoEndOfFolders === false) {
			const synoURL = `${photoApiUrl}?api=SYNO.FotoTeam.Browse.Folder&method=list&version=1&id=${FolderID}&limit=500&offset=${synoOffset}&SynoToken=${synoToken}`;
			Helper.ReportingInfo("Debug", "Synology", `Iterating folder id ${FolderID} `, { URL: synoURL });
			const synResult = await (synoConnection.get<any>(synoURL));
			Helper.ReportingInfo("Debug", "Synology", `Result iterating folder id ${FolderID}`, { JSON: JSON.stringify(synResult.data) });
			if (synResult.data["success"] === true && Array.isArray(synResult.data["data"]["list"])) {
				if (synResult.data["data"]["list"].length === 0) {
					synoEndOfFolders = true;
				} else {
					for (const element of synResult.data["data"]["list"]) {
						synoFolders.push({ id: element.id, name: element.name, parent: element.parent });
						await synoGetFolders(Helper, element.id)
					}
					synoOffset = synoOffset + 500;
				}
			} else {
				Helper.ReportingError(null, "Error getting folders from Synology", "Synology", "synoGetFolders", JSON.stringify(synResult.data), false);
				return false;
			}

		}
		return true;
	} catch (err) {
		Helper.ReportingError(err as Error, "Unknown error", "Synology", "synoGetFolders");
		return false;
	}
}

async function sortByKey(array: Array<any>, key: string): Promise<Array<any>> {
	return array.sort(function (a: any, b: any) {
		const x = a[key];
		const y = b[key];
		return ((x < y) ? -1 : ((x > y) ? 1 : 0));
	});
}
