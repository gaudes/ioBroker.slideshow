import { GlobalHelper } from "./global-helper";
import nominatim from "nominatim-client";

export interface locationInfos {
	country: string | null;
	state: string | null;
	county: string | null;
	city: string | null;
}

export async function getLocationInfos(Helper: GlobalHelper, lat: number, long: number): Promise<locationInfos | null> {
	try {
		const locationInfos = await downloadLocationInfos(Helper, lat, long);
		let result = null;

		if (locationInfos && locationInfos.address) {
			result = {
				country: locationInfos.address.country ? locationInfos.address.country : null,
				state: locationInfos.address.state ? locationInfos.address.state : null,
				county: locationInfos.address.county ? locationInfos.address.county : null,
				city: locationInfos.address.city ? locationInfos.address.city : null
			}
		}

		return result;

	} catch (error) {
		Helper.ReportingError(error as Error, "Unknown Error", "exifr", "getLocationInfos");
		return null;
	}
}

async function downloadLocationInfos(Helper: GlobalHelper, lat: number, long: number): Promise<any | null> {
	try {
		const client = nominatim.createClient({
			useragent: "ioBroker",             // The name of your application
			referer: 'https://nominatim.openstreetmap.org',  // The referer link
		});

		const query = {
			lat: lat,
			lon: long,
			zoom: 18,
			"accept-language": Helper.getLanguage()
		};

		return new Promise(resolve => {
			client.reverse(query).then((result) => {
				Helper.ReportingInfo("Debug", "Adapter", `[downloadLocationInfos]: ${JSON.stringify(result)}`);
				resolve(result);
			});
		});
	} catch (error) {
		Helper.ReportingError(error as Error, "Unknown Error", "exifr", "downloadLocationInfos");
		return null;
	}
}