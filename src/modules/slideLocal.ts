import { GlobalHelper } from "./global-helper";
import { getPictureInformation } from "./exif"

export interface LocalPicture{
	url: string,
	path: string,
	info1: string,
	info2: string,
	info3: string,
	date: Date | null
}

export interface LocalPictureListUpdateResult{
	success: boolean;
	picturecount: number;
}

let CurrentImages: LocalPicture[];
let CurrentImage: LocalPicture;

export async function getPicture(Helper: GlobalHelper): Promise<LocalPicture | null> {
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
			return CurrentImage;
		}
		return null;
	}catch(err){
		Helper.ReportingError(err, "Unknown Error", "Local", "getPicture");
		return null;
	}
}

export async function updatePictureList(Helper: GlobalHelper): Promise<LocalPictureListUpdateResult> {
	try{
		CurrentImages = [];
		const CurrentImageFiles = await (Helper.Adapter.readDirAsync("vis.0", "/slideshow"));
		if (!(CurrentImageFiles.length > 0)){
			Helper.ReportingError(null, "No pictures found in folder", "Local", "updatePictureList/List","", false);
			return { success: false, picturecount: 0};
		} else {
			await Promise.all(CurrentImageFiles.map(async file => {
				const CurrentImageFile = await Helper.Adapter.readFileAsync("vis.0", `/slideshow/${file.file}`);
				const fileInfo = await getPictureInformation(Helper, CurrentImageFile.file);
				let info1, info2, info3 = "";
				let date = null;
				fileInfo?.info1 ? info1 = fileInfo?.info1 : info1 = "";
				fileInfo?.info2 ? info2 = fileInfo?.info2 : info2 = "";
				fileInfo?.info3 ? info3 = fileInfo?.info3 : info3 = "";
				fileInfo?.date ? date = fileInfo?.date : date = null;
				if (Array.isArray(CurrentImages)){
					CurrentImages.push( {url: `/vis.0/slideshow/${file.file}`, path: file.file, info1: info1, info2: info2, info3: info3, date: date} );
				}else{
					CurrentImages = [ {url: `/vis.0/slideshow/${file.file}`, path: file.file, info1: info1, info2: info2, info3: info3, date: date} ];
				}
			}))
		}
		Helper.ReportingInfo("Info", "Local", `${CurrentImages.length} pictures found`, {JSON: JSON.stringify(CurrentImages.slice(0, 10))} );
		return { success: true, picturecount: CurrentImages.length};
	}catch(err) {
		Helper.ReportingError(err, "Unknown Error", "Local", "updatePictureList/List");
		return { success: false, picturecount: 0};
	}
}