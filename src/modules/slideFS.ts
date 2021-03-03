import { GlobalHelper } from "./global-helper";
import * as fs from "fs";
import * as path from "path";
import * as imgsize from "image-size";
import { getPictureInformation } from "./exif"

export interface FSPicture{
	path:string,
	url: string,
	info1: string,
	info2: string,
	info3: string,
	date: Date | null
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
				const PicContent = fs.readFileSync(CurrentImage.path);
				const PicContentB64 = PicContent.toString("base64");
				return { ...CurrentImage, url: `data:image/jpeg;base64,${PicContentB64}`};
			}else{
				Helper.ReportingError(null, `File not accessible: ${CurrentImage.path}`, "Filesystem", "getPicture", "", false);
				return null;
			}
		}
		return null;
	}catch(err){
		Helper.ReportingError(err, "Unknown Error", "Filesystem", "getPicture");
		return null;
	}
}

export async function updatePictureList(Helper: GlobalHelper): Promise<FSPictureListUpdateResult> {
	try{
		// Check if folder exists
		if (! fs.existsSync(Helper.Adapter.config.fs_path)){
			Helper.Adapter.log.error(`Folder ${Helper.Adapter.config.fs_path} does not exist`);
			return { success: false, picturecount: 0 };
		}
		// Filter for JPEG or JPG files
		const CurrentFileList = await getAllFiles(Helper.Adapter.config.fs_path);
		Helper.ReportingInfo("Info", "Filesystem", `${CurrentFileList.length} total files found in folder ${Helper.Adapter.config.fs_path}`, {JSON: JSON.stringify(CurrentFileList.slice(0, 99))} );
		const CurrentImageList = CurrentFileList.filter(function(file){
			if (path.extname(file).toLowerCase() === ".jpg" || path.extname(file).toLowerCase() === ".jpeg" || path.extname(file).toLowerCase() === ".png"){
				return file;
			}
		})
		// Checking orientation of pictures (landscape or portrait) if configured
		for (const ImageIndex in CurrentImageList){
			if (Helper.Adapter.config.fs_format !== 0){
				const ImageSize = await imgsize.imageSize(CurrentImageList[ImageIndex]);
				if (ImageSize.width && ImageSize.height){
					if ((Helper.Adapter.config.fs_format === 1 && ImageSize.width > ImageSize.height) === true){
						if (Array.isArray(CurrentImages)){
							CurrentImages.push( {path: CurrentImageList[ImageIndex], url: "", info1: "", info2: "", info3: "", date: null} );
						}else{
							CurrentImages = [ {path: CurrentImageList[ImageIndex], url: "", info1: "", info2: "", info3: "", date: null} ];
						}
					}
					if ((Helper.Adapter.config.fs_format === 2 && ImageSize.height > ImageSize.width) === true){
						if (Array.isArray(CurrentImages)){
							CurrentImages.push( {path: CurrentImageList[ImageIndex], url: "", info1: "", info2: "", info3: "", date: null} );
						}else{
							CurrentImages = [ {path: CurrentImageList[ImageIndex], url: "", info1: "", info2: "", info3: "", date: null} ];
						}
					}
				}
			}else{
				if (Array.isArray(CurrentImages)){
					CurrentImages.push( {path: CurrentImageList[ImageIndex], url: "", info1: "", info2: "", info3: "", date: null} );
				}else{
					CurrentImages = [ {path: CurrentImageList[ImageIndex], url: "", info1: "", info2: "", info3: "", date: null} ];
				}
			}
		}

		// Fillup picture information
		if (CurrentImages.length > 0) {
			await Promise.all(CurrentImages.map(async CurrentImage => {
				const fileInfo = await getPictureInformation(Helper, CurrentImage.path);
				fileInfo?.info1 ? CurrentImage.info1 = fileInfo?.info1 : CurrentImage.info1 = "";
				fileInfo?.info2 ? CurrentImage.info2 = fileInfo?.info2 : CurrentImage.info2 = "";
				fileInfo?.info3 ? CurrentImage.info3 = fileInfo?.info3 : CurrentImage.info3 = "";
				fileInfo?.date ? CurrentImage.date = fileInfo?.date : CurrentImage.date = null;
			}))
		}

		// Images found ?
		if (!(CurrentImages.length > 0)){
			Helper.ReportingError(null, "No pictures found in folder", "Filesystem", "updatePictureList","", false);
			return { success: false, picturecount: 0 };
		}else{
			Helper.ReportingInfo("Info", "Filesystem", `${CurrentImages.length} pictures found in folder ${Helper.Adapter.config.fs_path}`, {JSON: JSON.stringify(CurrentImages.slice(0, 99))} );
			return { success: true, picturecount: CurrentImages.length };
		}
	}catch(err) {
		Helper.ReportingError(err, "Unknown Error", "Filesystem", "updatePictureList");
		return { success: false, picturecount: 0 };
	}
}

async function getAllFiles(dirPath: string, _arrayOfFiles: string[] = []): Promise<string[]> {
	const files = await fs.readdirSync(dirPath);
	_arrayOfFiles = _arrayOfFiles || [];
	files.forEach(async function(file) {
		if (fs.statSync(dirPath + "/" + file).isDirectory()) {
			_arrayOfFiles = await getAllFiles(dirPath + "/" + file, _arrayOfFiles);
	  	} else {
			_arrayOfFiles.push(path.join(dirPath, "/", file));
	  	}
	})
	return _arrayOfFiles;
}