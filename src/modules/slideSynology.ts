import { GlobalHelper } from "./global-helper";
import axios, { AxiosError } from "axios";
import { wrapper } from "axios-cookiejar-support"
import { CookieJar } from "tough-cookie";
import * as nominatim from "./nominatim"

import * as path from "path";

export interface SynoPicture{
	url: string,
	path: string,
	info1: string,
	info2: string,
	info3: string,
	date: Date | null,
	x: number,
	y: number,
	latitude: number | null,
	longitude: number | null,
	locationInfos: nominatim.locationInfos | null
}

export interface SynoPictureListUpdateResult{
	success: boolean;
	picturecount: number;
}

// Connection State for internal use
let synoConnectionState  = false;
// Synology Login Token
let synoToken = "";
// Authentication Cookie
const AxiosJar = new CookieJar();
// Axios instance with options
const synoConnection = wrapper(axios.create({ withCredentials: true, jar: AxiosJar} ));

// Output of Axios Request or Response
/*
synoConnection.interceptors.request.use( x =>{
	console.log(x);
	return x;
} );
synoConnection.interceptors.response.use (x =>{
	console.log(x);
	return x;
} );
*/

let CurrentImages: SynoPicture[];
let CurrentImage: SynoPicture;
let CurrentPicture: SynoPicture;

export async function getPicture(Helper: GlobalHelper): Promise<SynoPicture | null>{
	try{
		if (!CurrentPicture){
			await getPicturePrefetch(Helper);
		}
		const CurrentPictureResult = CurrentPicture;
		getPicturePrefetch(Helper);
		return CurrentPictureResult;
	} catch (err){
		Helper.ReportingError(err as Error, "Unknown Error", "Synology", "getPicture");
		return null;
	}
}

export async function getPicturePrefetch(Helper: GlobalHelper): Promise<void> {
	// Select Image from list
	try{
		if (CurrentImages.length !== 0){
			if (!CurrentImage){
				CurrentImage = CurrentImages[0];
			} else {
				if (CurrentImages.indexOf(CurrentImage) === CurrentImages.length - 1){
					CurrentImage = CurrentImages[0];
				} else {
					CurrentImage = CurrentImages[CurrentImages.indexOf(CurrentImage) + 1];
				}
			}
		}
	}catch(err){
		Helper.ReportingError(err as Error, "Unknown Error", "Synology", "getPicturePrefetch/Select");
	}
	// Retrieve Image
	try{
		await loginSyno(Helper);
		let synURL = "";
		if (Helper.Adapter.config.syno_version === 0){
			synURL = `http://${Helper.Adapter.config.syno_path}/photo/webapi/entry.cgi?api=SYNO.FotoTeam.Download&method=download&version=1&unit_id=%5B${CurrentImage.path}%5D&force_download=true&SynoToken=${synoToken}`;
		} else {
			synURL = `http://${Helper.Adapter.config.syno_path}/photo/webapi/download.php?api=SYNO.PhotoStation.Download&method=getphoto&version=1&id=${CurrentImage.path}&download=true`;
		}
		const synResult = await synoConnection.get<any>(synURL,{responseType: "arraybuffer"});
		const PicContentB64 = synResult.data.toString("base64");
		CurrentPicture = { ...CurrentImage, url: `data:image/jpeg;base64,${PicContentB64}` };
	} catch (err){
		if ((err as AxiosError).response?.status === 502){
			Helper.ReportingError(err as Error, `Unknown Error downloading Picture ${CurrentImage.path}`, "Synology", "getPicturePrefetch/Retrieve", "", false);
		}else{
			Helper.ReportingError(err as Error, "Unknown Error", "Synology", "getPicturePrefetch/Retrieve");
		}
	}
}

export async function updatePictureList(Helper: GlobalHelper): Promise<SynoPictureListUpdateResult> {
	CurrentImages = [];
	await loginSyno(Helper);
	const CurrentImageList: SynoPicture[] = [ { path: "0", url: "", info1: "", info2: "", info3: "", date: null, x: 0, y: 0, latitude: null, longitude: null, locationInfos: null} ];
	if (synoConnectionState === true){
		// Retrieve complete list of pictures
		try{
			let synEndOfFiles = false;
			let synOffset = 0;
			while (synEndOfFiles === false){
				if (Helper.Adapter.config.syno_version === 0){
					let synURL = `http://${Helper.Adapter.config.syno_path}/photo/webapi/entry.cgi?api=SYNO.FotoTeam.Browse.Item&method=list_with_filter&version=1&limit=500&item_type=%5B0%5D&additional=%5B%22description%22%2C%22orientation%22%2C%22tag%22%2C%22resolution%22%5D&offset=${synOffset}&SynoToken=${synoToken}`;
					switch (Helper.Adapter.config.syno_order){
						case 1:
							//Filename
							synURL = synURL + "&sort_by=filename&sort_direction=asc";
							break;
						default:
							//Takendate
							synURL = synURL + "&sort_by=takentime";
							break;
					}
					const synResult = await (synoConnection.get<any>(synURL));
					if (synResult.data["success"] === true && Array.isArray(synResult.data["data"]["list"])){
						if (synResult.data["data"]["list"].length === 0){
							synEndOfFiles = true;
						} else {
							synResult.data["data"]["list"].forEach(element => {
								let PictureDate: Date | null = null;
								if (element.time){
									PictureDate = new Date(element.time);
								}
								CurrentImageList.push( {path: element.id, url: "", info1: element.description, info2: "", info3: element.filename, date: PictureDate, x: element.additional.resolution.height, y: element.additional.resolution.width, latitude: null, longitude: null, locationInfos: null } );
							});
							synOffset = synOffset + 500;
						}
					}else{
						Helper.ReportingError(null, "Error getting pictures from Synology", "Synology", "updatePictureList/List", JSON.stringify(synResult.data), false);
						return { success: false, picturecount: 0 };
					}
				} else {
					let synURL = `http://${Helper.Adapter.config.syno_path}/photo/webapi/photo.php?api=SYNO.PhotoStation.Photo&method=list&version=1&limit=500&type=photo&offset=${synOffset}`;
					switch (Helper.Adapter.config.syno_order){
						case 1:
							//Filename
							synURL = synURL + "&sort_by=filename";
							break;
						case 2:
							//Createdate
							synURL = synURL + "&sort_by=createdate";
							break;
						default:
							//Takendate
							synURL = synURL + "&sort_by=takendate";
							break;
					}
					const synResult = await (synoConnection.get<any>(synURL));
					if (synResult.data["success"] === true && Array.isArray(synResult.data["data"]["items"])){
						synResult.data["data"]["items"].forEach(element => {
							let PictureDate: Date | null = null;
							if (element.info.takendate){
								PictureDate = new Date(element.info.takendate);
							}
							CurrentImageList.push( {path: element.id, url: "", info1: element.info.title, info2: element.info.description, info3: element.info.name, date: PictureDate, x: element.info.resolutionx, y: element.info.resolutiony, latitude: null, longitude: null, locationInfos: null } );
						});
						if (synResult.data["data"]["total"] === synResult.data["data"]["offset"]){
							synEndOfFiles = true;
						} else {
							synOffset = synResult.data["data"]["offset"];
						}
					}else{
						Helper.ReportingError(null, "Error getting pictures from Synology", "Synology", "updatePictureList/List", JSON.stringify(synResult.data), false);
						return { success: false, picturecount: 0 };
					}
				}
			}
		} catch (err){
			Helper.ReportingError(err as Error, "Unknown Error", "Synology", "updatePictureList/List");
			return { success: false, picturecount: 0 };
		}
		// Filter pictures
		try{
			// Filter for JPEG or JPG files
			const CurrentImageListFilter1 = CurrentImageList.filter(function(element){
				if (path.extname(element.info3).toLowerCase() === ".jpg" || path.extname(element.info3).toLowerCase() === ".jpeg"){
					return element;
				}
			});
			// Filter for orientation
			if (Helper.Adapter.config.syno_format > 0){
				CurrentImageListFilter1.filter(function(element){
					if ((Helper.Adapter.config.syno_format === 1 && element.x > element.y) === true){
						if (Array.isArray(CurrentImages)){
							CurrentImages.push(element);
						}else{
							CurrentImages = [ element ];
						}
					}
					if ((Helper.Adapter.config.syno_format === 2 && element.y > element.x) === true){
						if (Array.isArray(CurrentImages)){
							CurrentImages.push(element);
						}else{
							CurrentImages = [ element ];
						}
					}
				});
			}else{
				CurrentImages = CurrentImageListFilter1;
			}
			// Random order ?
			if (Helper.Adapter.config.syno_order === 3){
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
		} catch (err){
			Helper.ReportingError(err as Error, "Unknown Error", "Synology", "updatePictureList/Filter");
			return { success: false, picturecount: 0 };
		}
		// Images found ?
		if (!(CurrentImages.length > 0)){
			Helper.ReportingError(null, "No pictures found", "Synology", "updatePictureList","", false);
			return { success: false, picturecount: 0 };
		}else{
			Helper.ReportingInfo("Info", "Synology", `${CurrentImages.length} pictures found`, {JSON: JSON.stringify(CurrentImages.slice(0, 99))} );
			return { success: true, picturecount: CurrentImages.length };
		}
	} else{
		return { success: false, picturecount: 0 };
	}
}

async function loginSyno(Helper: GlobalHelper): Promise<boolean>{
	// Check parameters
	try{
		if (Helper.Adapter.config.syno_path === "" || Helper.Adapter.config.syno_path === null){
			Helper.Adapter.log.error("No name or IP address of Synology PhotoStation configured");
			return false;
		}
		if (Helper.Adapter.config.syno_username === "" || Helper.Adapter.config.syno_username === null){
			Helper.Adapter.log.error("No user name for Synology PhotoStation configured");
			return false;
		}
		if (Helper.Adapter.config.syno_userpass === "" || Helper.Adapter.config.syno_userpass === null){
			Helper.Adapter.log.error("No user name for Synology PhotoStation configured");
			return false;
		}
	} catch (err){
		Helper.ReportingError(err as Error, "Unknown error", "Synology", "loginSyno/CheckParameters");
		synoConnectionState = false;
		return false;
	}
	// Run connection check
	if (await synoCheckConnection(Helper) === true){
		return true;
	} else{
		// Run Login
		try{
			if (Helper.Adapter.config.syno_version === 0){
				const synoURL = `http://${Helper.Adapter.config.syno_path}/photo/webapi/entry.cgi?api=SYNO.API.Auth&version=6&method=login&account=${Helper.Adapter.config.syno_username}&passwd=${encodeURIComponent(Helper.Adapter.config.syno_userpass)}&enable_syno_token=yes`;
 				const synResult = await (synoConnection.get<any>(synoURL));
				if (synResult.data && synResult.data["data"] && synResult.data["data"]["sid"] && synResult.data["success"] === true){
					synoToken = synResult.data["data"]["synotoken"];
					synoConnectionState = true;
					Helper.ReportingInfo("Debug", "Synology", "Synology Login successfull");
					return true;
				}else{
					Helper.Adapter.log.error("Connection failure to Synology PhotoStation");
					synoConnectionState = false;
					return false;
				}
			} else{
				const synResult = await (synoConnection.get<any>(`http://${Helper.Adapter.config.syno_path}/photo/webapi/auth.php?api=SYNO.PhotoStation.Auth&method=login&version=1&username=${Helper.Adapter.config.syno_username}&password=${encodeURIComponent(Helper.Adapter.config.syno_userpass)}`));
				Helper.ReportingInfo("Debug", "Synology", "Synology result data", { result: synResult } );
				if (synResult.data && synResult.data["data"] && synResult.data["data"]["username"] === Helper.Adapter.config.syno_username){
					synoConnectionState = true;
					Helper.ReportingInfo("Debug", "Synology", "Synology Login successfull");
					return true;
				}else{
					Helper.Adapter.log.error("Connection failure to Synology PhotoStation");
					synoConnectionState = false;
					return false;
				}
			}
		} catch (err){
			if ((err as AxiosError).response?.status === 403){
				synoConnectionState = false;
				return false;
			}else if ((err as AxiosError).isAxiosError === true){
				Helper.Adapter.log.error("No connection to Synology PhotoStation, misconfigured name or IP address");
				synoConnectionState = false;
				return false;
			}else{
				Helper.ReportingError(err as Error, "Unknown error", "Synology", "loginSyno/Login");
				synoConnectionState = false;
				return false;
			}
		}
	}
}

async function synoCheckConnection(Helper: GlobalHelper): Promise<boolean>{
	try{
		if (Helper.Adapter.config.syno_version === 0){
			const synoURL = `http://${Helper.Adapter.config.syno_path}/photo/webapi/auth.cgi?api=SYNO.Core.Desktop.Initdata&method=get_user_service&version=1&SynoToken=${synoToken}`;
			const synResult = await (synoConnection.get<any>(synoURL));
			if (synResult.status === 200){
				if (synResult.data.data?.Session?.isLogined === true){
					synoConnectionState = true;
					return true;
				}else{
					synoConnectionState = false;
				}
			}else{
				synoConnectionState = false;
			}
		} else {
			const synoURL = `http://${Helper.Adapter.config.syno_path}/photo/webapi/auth.php?api=SYNO.PhotoStation.Auth&method=checkauth&version=1`;
			const synResult = await (synoConnection.get<any>(synoURL));
			if (synResult.status === 200){
				if (synResult.data.data?.username === Helper.Adapter.config.syno_username){
					synoConnectionState = true;
					return true;
				}else{
					synoConnectionState = false;
				}
			}else{
				synoConnectionState = false;
			}
		}
	}catch(err){
		if ((err as AxiosError).response?.status === 403){
			synoConnectionState = false;
			return false;
		}else if ((err as AxiosError).isAxiosError === true){
			Helper.Adapter.log.error("No connection to Synology PhotoStation, misconfigured name or IP address");
			synoConnectionState = false;
			return false;
		}else{
			Helper.ReportingError(err as Error, "Unknown error", "Synology", "synoCheckConnection");
			synoConnectionState = false;
			return false;
		}
	}
	return false;
}