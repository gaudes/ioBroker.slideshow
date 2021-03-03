import { GlobalHelper } from "./global-helper";
import axios from "axios";
import {
	AxiosInstance,
	AxiosResponse
} from "axios";
import * as path from "path";

export interface SynoPicture{
	url: string,
	path: string,
	info1: string,
	info2: string,
	info3: string,
	date: Date | null,
	x: number,
	y: number
}

export interface SynoPictureListUpdateResult{
	success: boolean;
	picturecount: number;
}

// Connection State for internal use
let synoConnectionState  = false;
// Axios instance with options
const synoConnection: AxiosInstance = axios.create();

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
		Helper.ReportingError(err, "Unknown Error", "Synology", "getPicture");
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
		Helper.ReportingError(err, "Unknown Error", "Synology", "getPicturePrefetch/Select");
	}
	// Retrieve Image
	try{
		await loginSyno(Helper);
		const synURL = `http://${Helper.Adapter.config.syno_path}/photo/webapi/download.php?api=SYNO.PhotoStation.Download&method=getphoto&version=1&id=${CurrentImage.path}&download=true`;
		const synResult: AxiosResponse = await synoConnection.get(synURL,{responseType: "arraybuffer"});
		const PicContentB64 = synResult.data.toString("base64");
		CurrentPicture = { ...CurrentImage, url: `data:image/jpeg;base64,${PicContentB64}` };
	} catch (err){
		Helper.ReportingError(err, "Unknown Error", "Synology", "getPicturePrefetch/Retrieve");
	}
}

export async function updatePictureList(Helper: GlobalHelper): Promise<SynoPictureListUpdateResult> {
	await loginSyno(Helper);
	const CurrentImageList: SynoPicture[] = [ { path: "0", url: "", info1: "", info2: "", info3: "", date: null, x: 0, y: 0} ];
	if (synoConnectionState === true){
		// Retrieve complete list of pictures
		try{
			let synEndOfFiles = false;
			let synOffset = 0;
			while (synEndOfFiles === false){
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
				const synResult: AxiosResponse = await (synoConnection.get(synURL));
				if (synResult.data["success"] === true && Array.isArray(synResult.data["data"]["items"])){
					synResult.data["data"]["items"].forEach(element => {
						let PictureDate: Date | null = null;
						if (element.info.takendate){
							PictureDate = new Date(element.info.takendate);
						}
						CurrentImageList.push( {path: element.id, url: "", info1: element.info.title, info2: element.info.description, info3: element.info.name, date: PictureDate, x: element.info.resolutionx, y: element.info.resolutiony } );
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
		} catch (err){
			Helper.ReportingError(err, "Unknown Error", "Synology", "updatePictureList/List");
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
			Helper.ReportingError(err, "Unknown Error", "Synology", "updatePictureList/Filter");
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
		Helper.ReportingError(err, "Unknown error", "Synology", "loginSyno/CheckParameters");
		synoConnectionState = false;
		return false;
	}
	// Run connection check
	if (await synoCheckConnection(Helper) === true){
		return true;
	} else{
		// Run Login
		try{
			const synResult: AxiosResponse = await (synoConnection.get(`http://${Helper.Adapter.config.syno_path}/photo/webapi/auth.php?api=SYNO.PhotoStation.Auth&method=login&version=1&username=${Helper.Adapter.config.syno_username}&password=${Helper.Adapter.config.syno_userpass}`));
			if (synResult.data["data"]["username"] === Helper.Adapter.config.syno_username){
				synoConnection.defaults.headers.Cookie = synResult.headers["set-cookie"][0];
				synoConnectionState = true;
				Helper.ReportingInfo("Debug", "Synology", "Synology Login successfull");
				return true;
			}
		} catch (err){
			if (err.response?.status === 403){
				synoConnectionState = false;
				return false;
			}else if (err.isAxiosError === true){
				Helper.Adapter.log.error("No connection to Synology PhotoStation, misconfigured name or IP address");
				synoConnectionState = false;
				return false;
			}else{
				Helper.ReportingError(err, "Unknown error", "Synology", "loginSyno/Login");
				synoConnectionState = false;
				return false;
			}
		}
	}
	return false;
}

async function synoCheckConnection(Helper: GlobalHelper): Promise<boolean>{
	try{
		const synResult: AxiosResponse = await (synoConnection.get(`http://${Helper.Adapter.config.syno_path}/photo/webapi/auth.php?api=SYNO.PhotoStation.Auth&method=checkauth&version=1`));
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
	}catch(err){
		if (err.response?.status === 403){
			synoConnectionState = false;
			return false;
		}else if (err.isAxiosError === true){
			Helper.Adapter.log.error("No connection to Synology PhotoStation, misconfigured name or IP address");
			synoConnectionState = false;
			return false;
		}else{
			Helper.ReportingError(err, "Unknown error", "Synology", "synoCheckConnection");
			synoConnectionState = false;
			return false;
		}
	}
	return false;
}