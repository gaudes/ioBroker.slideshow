import * as exifr from "exifr";
import { GlobalHelper } from "./global-helper";
import { ExifImage } from "exif";
import moment from "moment";

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

		let date = null;

		if (!PictureInfo || !PictureInfo["DateTimeOriginal"] || !GpsInfo || !GpsInfo.latitude || !GpsInfo.longitude) {			
			let fallbackData = await getExifFallback(Helper, file);
			Helper.ReportingInfo("Info", "Adapter", file + ": trying to get EXIF Data using fallback lib");

			if (fallbackData && fallbackData.exif) {
				date = fallbackData && fallbackData.exif && fallbackData.exif.DateTimeOriginal ? new Date(moment(fallbackData.exif.DateTimeOriginal, 'YYYY:MM:DD HH:mm:ss').toString()) : null;
			}
		}

		return {
			info1: PictureInfo && PictureInfo["XPTitle"] ? PictureInfo["XPTitle"] : "",
			info2: PictureInfo && PictureInfo["XPSubject"] ? PictureInfo["XPSubject"] : "",
			info3: PictureInfo && PictureInfo["XPComment"] ? PictureInfo["XPComment"] : "",
			date: PictureInfo && PictureInfo["DateTimeOriginal"] ? new Date(PictureInfo["DateTimeOriginal"]) : date,
			latitude: GpsInfo && GpsInfo.latitude ? GpsInfo.latitude : null,
			longitude: GpsInfo && GpsInfo.longitude ? GpsInfo.longitude : null
		};
	} catch (error) {
		Helper.ReportingError(error as Error, "Unknown Error", "exifr", "getPictureInformation");
		return null;
	}
}

async function getExifFallback(Helper: GlobalHelper, file: string | Buffer): Promise<any | null> {
	return new Promise(resolve => {
		new ExifImage(file, (error, data) => {
			if (error) {
				if (error.message === "The Exif data is not valid.") {
					Helper.ReportingInfo("Debug", "Adapter", `[getExifFallback]: ${error.message}`);
				} else {
					Helper.ReportingError(error as Error, "Unknown Error", "exif", "getExifFallback");
				}
				resolve(null);
			} else {
				resolve(data);
			}
		});
	});
}