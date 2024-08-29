import { GlobalHelper } from "./global-helper";
import nominatim from "nominatim-client";
import { devNull } from "node:os";

export interface locationInfos {
	country: string | null;
	state: string | null;
	county: string | null;
	city: string | null;
	display_name: string | null;
}

export async function getLocationInfos(Helper: GlobalHelper, CurrentPictureResult: any): Promise<locationInfos | null> {
	try {
		const locationInfos = await downloadLocationInfos(Helper, CurrentPictureResult);
		let result = null;

		if (locationInfos) {
			result = {
				country: locationInfos.address && locationInfos.address.country ? locationInfos.address.country : null,
				state: locationInfos.address && locationInfos.address.state ? locationInfos.address.state : null,
				county: locationInfos.address && locationInfos.address.county ? locationInfos.address.county : null,
				city: locationInfos.address && locationInfos.address.city ? locationInfos.address.city : null,
				display_name: locationInfos.display_name ? locationInfos.display_name : null
			}
		}

		return result;

	} catch (error) {
		Helper.ReportingError(error as Error, `${CurrentPictureResult.path} Unknown Error`, "exifr", "getLocationInfos");
		return null;
	}
}

async function downloadLocationInfos(Helper: GlobalHelper, CurrentPictureResult: any): Promise<any | null> {
	try {
		const client = nominatim.createClient({
			useragent: `ioBroker-slideshow-${(Math.random() * (100000 - 1)) + 1}@iobroker.net`,             // The name of your application
			referer: 'https://nominatim.openstreetmap.org',  // The referer link
		});

		const query = {
			lat: CurrentPictureResult.latitude.toFixed(8),
			lon: CurrentPictureResult.longitude.toFixed(8),
			zoom: 18,
			"accept-language": Helper.getLanguage()
		};

		return new Promise(resolve => {
			client.reverse(query).then((result) => {
				Helper.ReportingInfo("Debug", "Adapter", `[downloadLocationInfos]: ${JSON.stringify(result)}`);
				resolve(result);
			}).catch((error) => {
				Helper.ReportingError(error as Error, `${CurrentPictureResult.path}, query: ${JSON.stringify(query)} Unknown Error`, "exifr", "downloadLocationInfos");
				resolve(undefined);
			});
		});
	} catch (error) {
		Helper.ReportingError(error as Error, `${CurrentPictureResult.path} Unknown Error`, "exifr", "downloadLocationInfos");
		return null;
	}
}