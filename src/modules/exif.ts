import * as exifr from "exifr";
import { GlobalHelper } from "./global-helper"

export interface exifinfo {
	info1: string;
	info2: string;
	info3: string;
	date: Date | null;
	latitude: number | null;
	longitude: number | null;
}

export async function getPictureInformation(Helper: GlobalHelper, file: string | Buffer): Promise<exifinfo | null> {
	try {
		const PictureInfo = await exifr.parse(file, ["XPTitle", "XPComment", "XPSubject", "DateTimeOriginal", "latitude", "longitude"]);
		const GpsInfo = await exifr.gps(file);

		return {
			info1: PictureInfo && PictureInfo["XPTitle"] ? PictureInfo["XPTitle"] : "",
			info2: PictureInfo && PictureInfo["XPSubject"] ? PictureInfo["XPSubject"] : "",
			info3: PictureInfo && PictureInfo["XPComment"] ? PictureInfo["XPComment"] : "",
			date: PictureInfo && PictureInfo["DateTimeOriginal"] ? new Date(PictureInfo["DateTimeOriginal"]) : null,
			latitude: GpsInfo && GpsInfo.latitude ? GpsInfo.latitude : null,
			longitude: GpsInfo && GpsInfo.longitude ? GpsInfo.longitude : null
		};
	} catch (error) {
		Helper.ReportingError(error as Error, "Unknown Error", "exif", "getPictureInformation");
		return null;
	}
}