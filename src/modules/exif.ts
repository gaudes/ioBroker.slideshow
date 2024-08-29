import * as exifr from "exifr";
import { GlobalHelper } from "./global-helper";
import { ExifImage } from "exif";
import moment from "moment";
import gpsCoordParser from "coordinate-parser";



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
		let PictureInfo = await exifr.parse(file, true);
		let GpsInfo = await exifr.gps(file);

		if (!GpsInfo || !GpsInfo.latitude || !GpsInfo.longitude) {
			GpsInfo = {
				latitude: PictureInfo.latitude,
				longitude: PictureInfo.longitude
			};
		}

		let fallbackData = await getFallbackData(Helper, file, PictureInfo, GpsInfo);

		// if (!GpsInfo.latitude) {
		// 	Helper.Adapter.log.warn(`${file}: ${GpsInfo && GpsInfo.latitude ? GpsInfo.latitude : 'nix'}, ${fallbackData.latitude ? fallbackData.latitude : 'nix'}`);
		// }

		return {
			info1: PictureInfo && PictureInfo["XPTitle"] ? PictureInfo["XPTitle"] : "",
			info2: PictureInfo && PictureInfo["XPSubject"] ? PictureInfo["XPSubject"] : "",
			info3: PictureInfo && PictureInfo["XPComment"] ? PictureInfo["XPComment"] : "",
			date: PictureInfo && PictureInfo["DateTimeOriginal"] ? new Date(PictureInfo["DateTimeOriginal"]) : fallbackData.date,
			latitude: GpsInfo && GpsInfo.latitude ? GpsInfo.latitude : fallbackData.latitude,
			longitude: GpsInfo && GpsInfo.longitude ? GpsInfo.longitude : fallbackData.longitude
		};
	} catch (error) {
		Helper.ReportingError(error as Error, "Unknown Error", "exifr", "getPictureInformation");
		return null;
	}
}

//#region Fallback
export interface fallbackLib {
	date: Date | null;
	latitude: number | null;
	longitude: number | null;
}

async function getFallbackData(Helper: GlobalHelper, file: string | Buffer, PictureInfo: any, GpsInfo: any): Promise<fallbackLib> {
	let fallbackDate = null;
	let fallbackLatitude = null;
	let fallbackLongitude = null;

	if (!PictureInfo || !PictureInfo["DateTimeOriginal"] || !GpsInfo || !GpsInfo.latitude || !GpsInfo.longitude) {
		let fallbackData = await getExifFallback(Helper, file);

		// Helper.Adapter.log.warn(JSON.stringify(fallbackData));

		if (fallbackData) {
			if (!PictureInfo || !PictureInfo["DateTimeOriginal"]) {
				if (fallbackData.exif && fallbackData.exif.DateTimeOriginal) {
					Helper.ReportingInfo("Debug", "Adapter", `using fallback lib: file: '${file}', DateTimeOriginal: '${fallbackData.exif.DateTimeOriginal}'`);
					fallbackDate = fallbackData.exif && fallbackData.exif.DateTimeOriginal ? new Date(moment(fallbackData.exif.DateTimeOriginal, 'YYYY:MM:DD HH:mm:ss').toString()) : null;
				}
			}

			if (fallbackDate === null && fallbackData.gps && fallbackData.gps.GPSDateStamp) {
				Helper.ReportingInfo("Debug", "Adapter", `using fallback lib: file: '${file}', GPSDateStamp: '${fallbackData.gps.GPSDateStamp}'`);
				fallbackDate = new Date(moment(fallbackData.gps.GPSDateStamp, 'YYYY:MM:DD').toString());
			}

			if (!GpsInfo || !GpsInfo.latitude || !GpsInfo.longitude) {
				if (fallbackData.gps && fallbackData.gps.GPSLatitudeRef && fallbackData.gps.GPSLatitude && fallbackData.gps.GPSLongitudeRef && fallbackData.gps.GPSLongitude) {
					let latitudeTmp = `${fallbackData.gps.GPSLatitude[0]}:${fallbackData.gps.GPSLatitude[1]}:${fallbackData.gps.GPSLatitude[2]}${fallbackData.gps.GPSLatitudeRef}`
					let longitudeTmp = `${fallbackData.gps.GPSLongitude[0]}:${fallbackData.gps.GPSLongitude[1]}:${fallbackData.gps.GPSLongitude[2]}${fallbackData.gps.GPSLongitudeRef}`

					let coordTmp = `${latitudeTmp} ${longitudeTmp}`;

					Helper.ReportingInfo("Debug", "Adapter", `using fallback lib: file: '${file}', Coordinates: '${coordTmp}'`);

					try {
						let position = new gpsCoordParser(coordTmp);

						fallbackLatitude = position.getLatitude();
						fallbackLongitude = position.getLongitude();
					} catch (err) {
						Helper.ReportingError(err as Error, "Unknown Error", "gpsCoordParser", "getFallbackData");
					}
				}
			}
		}
	}

	return {
		date: fallbackDate,
		latitude: fallbackLatitude,
		longitude: fallbackLongitude
	}
}

async function getExifFallback(Helper: GlobalHelper, file: string | Buffer): Promise<any | null> {
	return new Promise(resolve => {
		new ExifImage(file, (error, data) => {
			if (error) {
				if (error.message.includes("The Exif data is not valid") || error.message.includes("No Exif segment found in the given image")) {
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
//#endregion