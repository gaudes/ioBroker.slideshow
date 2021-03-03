import axios from "axios";
import { GlobalHelper } from "./global-helper"

interface BingJSONImage{
	url: string,
	title: string,
	copyright: string,
	startdate: string,
	any: string|boolean|number
}

interface BingJSONImageList{
	images: BingJSONImage[],
	any: any
}

export interface BingPicture{
	bingurl: string,
	path: string,
	url: string,
	info1: string,
	info2: string,
	info3: string,
	date: Date
}

export interface BingPictureListUpdateResult{
	success: boolean;
	picturecount: number;
}

const BingUrl = "https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=10&mkt=de-DE";
let BingPictureList: BingPicture[];
let CurrentImage: BingPicture;

export async function getPicture(Helper: GlobalHelper): Promise<BingPicture | null > {
	try{
		if (BingPictureList.length === 0){
			await updatePictureList(Helper);
		}
		if (BingPictureList.length !== 0){
			if (!CurrentImage){
				CurrentImage = BingPictureList[0];
			} else {
				if (BingPictureList.indexOf(CurrentImage) === BingPictureList.length - 1){
					CurrentImage = BingPictureList[0];
				} else {
					CurrentImage = BingPictureList[BingPictureList.indexOf(CurrentImage) + 1];
				}
			}
			return CurrentImage;
		}
		return null;
	}catch (err){
		Helper.ReportingError(err, "Unknown Error", "Bing", "getPicture");
		return null;
	}
}

export async function updatePictureList(Helper: GlobalHelper): Promise<BingPictureListUpdateResult> {
	// Getting List from Bing.com
	try{
		const WebResult = await axios.get(BingUrl);
		Helper.ReportingInfo("Debug", "Bing", "Picture list received", { JSON: JSON.stringify(WebResult.data) });
		((WebResult.data) as BingJSONImageList).images.forEach(Image =>{
			const ImageDetails = Image.copyright.match(/(.*)\s\(©\s(.*)\)/);
			let ImageDescription = "";
			let ImageCopyright = ""
			if (ImageDetails){
				ImageDescription = ImageDetails[1];
				ImageCopyright = ImageDetails[2];
			}
			const ImageDate = new Date(parseInt(Image.startdate.substring(0,4)), parseInt(Image.startdate.substring(4,6)), parseInt(Image.startdate.substring(6,8)));
			if (Array.isArray(BingPictureList)){
				BingPictureList.push( {bingurl: "https://bing.com" + Image.url, url: "", path: "", info1: Image.title, info2: ImageDescription, info3: ImageCopyright, date: ImageDate} );
			} else{
				BingPictureList = [ {bingurl: "https://bing.com" + Image.url, url: "", path: "", info1: Image.title, info2: ImageDescription, info3: ImageCopyright, date: ImageDate} ];
			}
		});
	} catch (err) {
		Helper.ReportingError(err, "Unknown Error", "Bing", "updatePictureList/List");
		return { success: false, picturecount: 0};
	}
	// Saving list to files
	try{
		for (const CountElement in BingPictureList){
			const currentWebCall = await axios.get(BingPictureList[CountElement].bingurl,{responseType: "arraybuffer"});
			await Helper.Adapter.writeFileAsync(Helper.Adapter.namespace, `bing/${CountElement}.jpg`, currentWebCall.data);
			BingPictureList[CountElement].url = `/${Helper.Adapter.namespace}/bing/${CountElement}.jpg`;
			BingPictureList[CountElement].path = BingPictureList[CountElement].url;
		}
		Helper.ReportingInfo("Info", "Bing", `${BingPictureList.length} pictures downloaded from Bing`, {JSON: JSON.stringify(BingPictureList.slice(0, 10))} );
		return { success: true, picturecount: BingPictureList.length};
	} catch (err){
		Helper.ReportingError(err, "Unknown Error", "Bing", "updatePictureList/Download");
		return { success: false, picturecount: 0};
	}
}