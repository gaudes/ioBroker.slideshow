import { GlobalHelper } from "./global-helper";
import * as fs from "fs";
import * as path from "path";
import * as imgsize from "image-size";
import { getPictureInformation } from "./exif"
import * as nominatim from "./nominatim"

export interface FSPicture{
	path:string,
	url: string,
	info1: string,
	info2: string,
	info3: string,
	date: Date | null,
	latitude: number | null,
	longitude: number | null,
	locationInfos: nominatim.locationInfos | null
}

export interface FSPictureListUpdateResult{
	success: boolean;
	picturecount: number;
}

let CurrentImages: FSPicture[];
let CurrentImage: FSPicture;

export async function getPicture(Helper: GlobalHelper): Promise<FSPicture | null> {
	try{
		if (CurrentImages.length === 0){
			await updatePictureList(Helper);
		}
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
			if (fs.existsSync(CurrentImage.path) === true){
				try {
					const PicContent = fs.readFileSync(CurrentImage.path);
					const PicContentB64 = PicContent.toString("base64");
					return { ...CurrentImage, url: `data:image/jpeg;base64,${PicContentB64}`};
				} catch (err) {
					Helper.ReportingError(null, `File not accessible: ${CurrentImage.path}`, "Filesystem", "getPicture", "", false);
					return null;
				}
			}else{
				Helper.ReportingError(null, `File not accessible: ${CurrentImage.path}`, "Filesystem", "getPicture", "", false);
				return null;
			}
		}
		return null;
	}catch(err){
		Helper.ReportingError(err as Error, "Unknown Error", "Filesystem", "getPicture");
		return null;
	}
}

export async function updatePictureList(Helper: GlobalHelper): Promise<FSPictureListUpdateResult> {
	try{
		CurrentImages = [];
		// Check if folder exists
		if (! fs.existsSync(Helper.Adapter.config.fs_path)){
			Helper.Adapter.log.error(`Folder ${Helper.Adapter.config.fs_path} does not exist`);
			return { success: false, picturecount: 0 };
		}
		// Filter for JPEG or JPG files
		const CurrentFileList = await getAllFiles(Helper, Helper.Adapter.config.fs_path);
		Helper.ReportingInfo("Info", "Filesystem", `${CurrentFileList.length} total files found in folder ${Helper.Adapter.config.fs_path}`, {JSON: JSON.stringify(CurrentFileList.slice(0, 99))} );
		const CurrentImageList = CurrentFileList.filter(function(file){
			if (path.extname(file).toLowerCase() === ".jpg" || path.extname(file).toLowerCase() === ".jpeg" || path.extname(file).toLowerCase() === ".png"){
				return file;
			}
		})
		// Checking orientation of pictures (landscape or portrait) if configured
		for (const ImageIndex in CurrentImageList){
			if (Helper.Adapter.config.fs_format !== 0){
				try {
					const ImageSize = await imgsize.imageSize(CurrentImageList[ImageIndex]);
					if (ImageSize.width && ImageSize.height){
						if ((Helper.Adapter.config.fs_format === 1 && ImageSize.width > ImageSize.height) === true){
							if (Array.isArray(CurrentImages)){
								CurrentImages.push( {path: CurrentImageList[ImageIndex], url: "", info1: "", info2: "", info3: "", date: null, latitude: null, longitude: null, locationInfos: null} );
							}else{
								CurrentImages = [ {path: CurrentImageList[ImageIndex], url: "", info1: "", info2: "", info3: "", date: null, latitude: null, longitude: null, locationInfos: null} ];
							}
						}
						if ((Helper.Adapter.config.fs_format === 2 && ImageSize.height > ImageSize.width) === true){
							if (Array.isArray(CurrentImages)){
								CurrentImages.push( {path: CurrentImageList[ImageIndex], url: "", info1: "", info2: "", info3: "", date: null, latitude: null, longitude: null, locationInfos: null} );
							}else{
								CurrentImages = [ {path: CurrentImageList[ImageIndex], url: "", info1: "", info2: "", info3: "", date: null, latitude: null, longitude: null, locationInfos: null} ];
							}
						}
					}
				} catch (err) {
					Helper.Adapter.log.error((err as Error).message);
				}
			}else{
				if (Array.isArray(CurrentImages)){
					CurrentImages.push( {path: CurrentImageList[ImageIndex], url: "", info1: "", info2: "", info3: "", date: null, latitude: null, longitude: null, locationInfos: null} );
				}else{
					CurrentImages = [ {path: CurrentImageList[ImageIndex], url: "", info1: "", info2: "", info3: "", date: null, latitude: null, longitude: null, locationInfos: null} ];
				}
			}
		}

		// Fillup picture information
		if (Array.isArray(CurrentImages)){
			if (CurrentImages.length > 0) {
				await Promise.all(CurrentImages.map(async CurrentImage => {
					const fileInfo = await getPictureInformation(Helper, CurrentImage.path);
					fileInfo?.info1 ? CurrentImage.info1 = fileInfo?.info1 : CurrentImage.info1 = "";
					fileInfo?.info2 ? CurrentImage.info2 = fileInfo?.info2 : CurrentImage.info2 = "";
					fileInfo?.info3 ? CurrentImage.info3 = fileInfo?.info3 : CurrentImage.info3 = "";
					fileInfo?.date ? CurrentImage.date = fileInfo?.date : CurrentImage.date = null;
					fileInfo?.latitude ? CurrentImage.latitude = fileInfo?.latitude : CurrentImage.latitude = null;
					fileInfo?.longitude ? CurrentImage.longitude = fileInfo?.longitude : CurrentImage.longitude = null;
				}))
			}
		}

		// Sort
		switch (Helper.Adapter.config.fs_order){
			case 1:
				//Filename
				Helper.ReportingInfo("Debug", "Filesystem", "Sort pictures by filename");
				CurrentImages.sort((a,b) => (a.path > b.path) ? 1 : ((b.path > a.path) ? -1 : 0))
				break;
			case 3:
				// Random order ?
				Helper.ReportingInfo("Debug", "Filesystem", "Sort pictures random");
				// See https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
				for (let i = CurrentImages.length - 1; i > 0; i--) {
					const j = Math.floor(Math.random() * (i + 1));
					[CurrentImages[i], CurrentImages[j]] = [CurrentImages[j], CurrentImages[i]];
				}
				break;
			default:
				//Takendate
				Helper.ReportingInfo("Debug", "Filesystem", "Sort pictures by takendate");
				CurrentImages.sort((a, b) => {
					if (a.date !== null && b.date !== null){
						if ( a.date < b.date ){
							return -1;
						}
						if ( a.date > b.date ){
							return 1;
						}
					}
					return 0;
				} )
				break;
		}

		// Images found ?
		if (!(CurrentImages.length > 0)){
			Helper.ReportingError(null, "No pictures found in folder", "Filesystem", "updatePictureList","", false);
			return { success: false, picturecount: 0 };
		}else{
			Helper.ReportingInfo("Info", "Filesystem", `${CurrentImages.length} pictures found in folder ${Helper.Adapter.config.fs_path}`, {JSON: JSON.stringify(CurrentImages.slice(0, 99))} );
			Helper.ReportingInfo("Debug", "Filesystem", `Pictures: ${JSON.stringify(CurrentImages.slice(0, 99))}`)
			return { success: true, picturecount: CurrentImages.length };
		}
	}catch(err) {
		Helper.ReportingError(err as Error, "Unknown Error", "Filesystem", "updatePictureList");
		return { success: false, picturecount: 0 };
	}
}

async function getAllFiles(Helper: GlobalHelper, dirPath: string, _arrayOfFiles: string[] = []): Promise<string[]> {
	_arrayOfFiles = _arrayOfFiles || [];
	try{
		const files = await fs.readdirSync(dirPath);
		files.forEach(async function(file) {
			try{
				if (fs.statSync(dirPath + "/" + file).isDirectory()) {
					_arrayOfFiles = await getAllFiles(Helper, dirPath + "/" + file, _arrayOfFiles);
				} else {
					_arrayOfFiles.push(path.join(dirPath, "/", file));
				}
			} catch (err) {
				Helper.ReportingError(err as Error, `Error scanning files: ${err} `, "Filesystem", "getAllFiles", "", false);
			}
		})
	} catch (err){
		Helper.ReportingError(err as Error, `Error scanning files: ${err} `, "Filesystem", "getAllFiles", "", false);
	}
	return _arrayOfFiles;
}