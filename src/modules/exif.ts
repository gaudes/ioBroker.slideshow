import * as exifr from "exifr";
import { GlobalHelper } from "./global-helper"

export interface exifinfo{
	info1: string;
	info2: string;
	info3: string;
	date: Date;
}

export async function getPictureInformation(Helper: GlobalHelper, file: string | Buffer ): Promise<exifinfo | null >{
	try{
		const PictureInfo = await exifr.parse(file, ["XPTitle", "XPComment", "XPSubject", "DateTimeOriginal"] );
		return { info1: PictureInfo["XPTitle"] || "", info2: PictureInfo["XPSubject"] || "", info3: PictureInfo["XPComment"] || "", date: new Date (PictureInfo["DateTimeOriginal"])};
	} catch (error) {
		return null;
	}
}