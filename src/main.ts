/*
 * Created with @iobroker/create-adapter v2.0.1
 */

//#region Imports, Variables and Global
import * as utils from "@iobroker/adapter-core";
import { GlobalHelper } from "./modules/global-helper";
import * as slideBing from "./modules/slideBing";
import * as slideLocal from "./modules/slideLocal";
import * as slideFS from "./modules/slideFS";
import * as slideSyno from "./modules/slideSynology"
import * as nominatim from "./modules/nominatim"

let Helper: GlobalHelper;
const MsgErrUnknown = "Unknown Error";
let UpdateRunning = false;
let language = 'en';
let storedLocations: { [key: string]: nominatim.locationInfos } = {};

interface Picture {
	url: string;
	path: string;
	info1: string;
	info2: string;
	info3: string;
	date: Date | null;
	latitude: number | null;
	longitude: number | null;
	locationInfos: nominatim.locationInfos | null;
}

interface PictureListUpdateResult {
	success: boolean;
	picturecount: number;
}

//#endregion

class Slideshow extends utils.Adapter {

	isUnloaded: boolean;

	//#region Basic Adapter Functions

	public constructor(options: Partial<utils.AdapterOptions> = {}) {
		super({
			...options,
			name: "slideshow",
		});
		this.on("ready", this.onReady.bind(this));
		this.on("stateChange", this.onStateChange.bind(this));
		this.on("unload", this.onUnload.bind(this));

		this.isUnloaded = false;
	}

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	private async onReady(): Promise<void> {
		try {
			// Init Helper
			var sysConfig = await this.getForeignObjectAsync('system.config');
			if (sysConfig && sysConfig.common && sysConfig.common['language']) {
				language = sysConfig.common['language']
			}

			Helper = new GlobalHelper(this, language);

			// Create button for updates
			await this.setObjectNotExistsAsync("updatepicturelist", {
				type: "state",
				common: {
					name: "updatepicturelist",
					type: "boolean",
					role: "button",
					read: true,
					write: true,
					desc: "Update picture list",
					def: false
				},
				native: {},
			});
			await this.setStateAsync("updatepicturelist", false, true);
			this.subscribeStates("updatepicturelist");

			// Starting updatePictureStoreTimer action
			await this.updatePictureStoreTimer();
		} catch (err) {
			Helper.ReportingError(err as Error, MsgErrUnknown, "onReady");
		}
	}

	/**
	 * Is called if a subscribed state changes
	 */
	private async onStateChange(id: string, state: ioBroker.State | null | undefined): Promise<void> {
		if (state) {
			if (id === `${this.namespace}.updatepicturelist` && state?.val === true && state?.ack === false) {
				if (UpdateRunning === true) {
					Helper.ReportingInfo("Info", "Adapter", "Update picture list already running");
				} else {
					Helper.ReportingInfo("Info", "Adapter", "Updating picture list");
					clearTimeout(this.tUpdateCurrentPictureTimeout);
					await this.updatePictureStoreTimer();
				}
				await this.setStateAsync("updatepicturelist", false, false);
			}
		}
	}

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 */
	private onUnload(callback: () => void): void {
		try {
			this.isUnloaded = true;
			clearTimeout(this.tUpdateCurrentPictureTimeout);
			clearTimeout(this.tUpdatePictureStoreTimeout);
			callback();
		} catch (e) {
			callback();
		}
	}

	//#endregion

	//#region Timer and Action

	private tUpdatePictureStoreTimeout: any = null;
	private tUpdateCurrentPictureTimeout: any = null;

	private async updatePictureStoreTimer(): Promise<void> {
		UpdateRunning = true;
		storedLocations = {};

		let updatePictureStoreResult: PictureListUpdateResult = { success: false, picturecount: 0 };
		Helper.ReportingInfo("Debug", "Adapter", "UpdatePictureStoreTimer occured");
		try {
			this.tUpdatePictureStoreTimeout && clearTimeout(this.tUpdatePictureStoreTimeout);
		} catch (err) {
			Helper.ReportingError(err as Error, MsgErrUnknown, "updatePictureStoreTimer", "Clear Timer");
		}
		try {
			switch (this.config.provider) {
				case 1:
					updatePictureStoreResult = await slideBing.updatePictureList(Helper);
					break;
				case 2:
					updatePictureStoreResult = await slideLocal.updatePictureList(Helper);
					break;
				case 3:
					updatePictureStoreResult = await slideFS.updatePictureList(Helper);
					break;
				case 4:
					updatePictureStoreResult = await slideSyno.updatePictureList(Helper);
					break;
			}
		} catch (err) {
			Helper.ReportingError(err as Error, MsgErrUnknown, "updatePictureStoreTimer", "Call Timer Action");
		}
		try {
			if (this.config.update_picture_list && this.config.update_picture_list > 0 && updatePictureStoreResult.success === true) {
				Helper.ReportingInfo("Debug", "updatePictureStoreTimer", `Update every ${this.config.update_picture_list} hours, starting timer`);
				this.tUpdatePictureStoreTimeout = setTimeout(() => {
					this.updatePictureStoreTimer();
				}, (this.config.update_picture_list * 3600000)); // Update every configured hours if successfull
			} else if (updatePictureStoreResult.success === false) {
				this.tUpdatePictureStoreTimeout = setTimeout(() => {
					this.updatePictureStoreTimer();
				}, (this.config.update_interval * 300000)); // Update every minute if error
			}
			if (updatePictureStoreResult.success === true && updatePictureStoreResult.picturecount > 0 && this.isUnloaded === false) {
				// Save picturecount
				await this.setObjectNotExistsAsync("picturecount", {
					type: "state",
					common: {
						name: "picturecount",
						type: "number",
						role: "value",
						read: true,
						write: false,
						desc: "Pictures found"
					},
					native: {},
				});
				await this.setStateAsync("picturecount", { val: updatePictureStoreResult.picturecount, ack: true });

				// Starting updateCurrentPictureTimer action
				this.updateCurrentPictureTimer();
			}
		} catch (err) {
			Helper.ReportingError(err as Error, MsgErrUnknown, "updatePictureStoreTimer", "Set Timer");
		}
		UpdateRunning = false;
	}

	private async updateCurrentPictureTimer(): Promise<void> {
		let CurrentPictureResult: Picture | null = null;
		let Provider = "";
		Helper.ReportingInfo("Debug", "Adapter", "updateCurrentPictureTimer occured");
		try {
			this.tUpdateCurrentPictureTimeout && clearTimeout(this.tUpdateCurrentPictureTimeout);
		} catch (err) {
			Helper.ReportingError(err as Error, MsgErrUnknown, "updateCurrentPictureTimer", "Clear Timer");
		}
		try {
			switch (this.config.provider) {
				case 1:
					CurrentPictureResult = await slideBing.getPicture(Helper);
					Provider = "Bing";
					break;
				case 2:
					CurrentPictureResult = await slideLocal.getPicture(Helper);
					Provider = "Local";
					break;
				case 3:
					CurrentPictureResult = await slideFS.getPicture(Helper);
					Provider = "FileSystem";
					break;
				case 4:
					CurrentPictureResult = await slideSyno.getPicture(Helper);
					Provider = "Synology";
					break;
			}
		} catch (err) {
			Helper.ReportingError(err as Error, MsgErrUnknown, "updateCurrentPictureTimer", "Call Timer Action");
		}
		try {
			if (CurrentPictureResult !== null && this.isUnloaded === false) {
				Helper.ReportingInfo("Debug", Provider, `Set picture to ${CurrentPictureResult.path}`);
				// Set picture
				await this.setObjectNotExistsAsync("picture", {
					type: "state",
					common: {
						name: "picture",
						type: "string",
						role: "text",
						read: true,
						write: false,
						desc: "Current picture"
					},
					native: {},
				});
				await this.setStateAsync("picture", { val: CurrentPictureResult.url, ack: true });
				// Set info1
				await this.setObjectNotExistsAsync("info1", {
					type: "state",
					common: {
						name: "info1",
						type: "string",
						role: "text",
						read: true,
						write: false,
						desc: "Info 1 for picture"
					},
					native: {},
				});
				await this.setStateAsync("info1", { val: CurrentPictureResult.info1, ack: true });
				// Set info2
				await this.setObjectNotExistsAsync("info2", {
					type: "state",
					common: {
						name: "info2",
						type: "string",
						role: "text",
						read: true,
						write: false,
						desc: "Info 2 for picture"
					},
					native: {},
				});
				await this.setStateAsync("info2", { val: CurrentPictureResult.info2, ack: true });
				// Set info3
				await this.setObjectNotExistsAsync("info3", {
					type: "state",
					common: {
						name: "info3",
						type: "string",
						role: "text",
						read: true,
						write: false,
						desc: "Info 3 for picture"
					},
					native: {},
				});
				await this.setStateAsync("info3", { val: CurrentPictureResult.info3, ack: true });
				// Set date
				await this.setObjectNotExistsAsync("date", {
					type: "state",
					common: {
						name: "date",
						type: "number",
						role: "date",
						read: true,
						write: false,
						desc: "Date of picture"
					},
					native: {},
				});
				await this.setStateAsync("date", { val: CurrentPictureResult.date?.getTime() || null, ack: true });
				// Set latitude
				await this.setObjectNotExistsAsync("latitude", {
					type: "state",
					common: {
						name: "latitude",
						type: "number",
						role: "latitude",
						read: true,
						write: false,
						desc: "Latitude of picture"
					},
					native: {},
				});
				await this.setStateAsync("latitude", { val: CurrentPictureResult.latitude || null, ack: true });
				// Set longitude
				await this.setObjectNotExistsAsync("longitude", {
					type: "state",
					common: {
						name: "longitude",
						type: "number",
						role: "longitude",
						read: true,
						write: false,
						desc: "Longitude of picture"
					},
					native: {},
				});
				await this.setStateAsync("longitude", { val: CurrentPictureResult.longitude || null, ack: true });

				await this.setLocationStates(CurrentPictureResult);
			}
		} catch (err) {
			Helper.ReportingError(err as Error, MsgErrUnknown, "updateCurrentPictureTimer", "Call Timer Action");
		}
		try {
			this.tUpdateCurrentPictureTimeout = setTimeout(() => {
				this.updateCurrentPictureTimer();
			}, (this.config.update_interval * 1000));
		} catch (err) {
			Helper.ReportingError(err as Error, MsgErrUnknown, "updateCurrentPictureTimer", "Set Timer");
		}
	}

	private async setLocationStates(CurrentPictureResult: Picture): Promise<void> {
		try {
			if (this.config.downloadLocationData) {
				if (CurrentPictureResult && CurrentPictureResult.latitude !== null && CurrentPictureResult.longitude !== null) {
					if (!await this.getObjectAsync("location")) {
						await this.createChannelAsync("", "location");
					}

					await this.setObjectNotExistsAsync("location.country", {
						type: "state",
						common: {
							name: "country",
							type: "string",
							role: "country",
							read: true,
							write: false,
							desc: "Country of picture"
						},
						native: {},
					});

					await this.setObjectNotExistsAsync("location.state", {
						type: "state",
						common: {
							name: "state",
							type: "string",
							role: "state",
							read: true,
							write: false,
							desc: "State of picture"
						},
						native: {},
					});

					await this.setObjectNotExistsAsync("location.county", {
						type: "state",
						common: {
							name: "county",
							type: "string",
							role: "county",
							read: true,
							write: false,
							desc: "County of picture"
						},
						native: {},
					});

					await this.setObjectNotExistsAsync("location.city", {
						type: "state",
						common: {
							name: "city",
							type: "string",
							role: "city",
							read: true,
							write: false,
							desc: "City of picture"
						},
						native: {},
					});

					await this.setObjectNotExistsAsync("location.display_name", {
						type: "state",
						common: {
							name: "display_name",
							type: "string",
							role: "display_name",
							read: true,
							write: false,
							desc: "Full Infos of picture"
						},
						native: {},
					});

					if (storedLocations && CurrentPictureResult.path && storedLocations[CurrentPictureResult.path]) {
						Helper.ReportingInfo("Debug", "Adapter", `[setLocationStates]: loading from cache (file: ${CurrentPictureResult.path}, data: ${JSON.stringify(storedLocations[CurrentPictureResult.path])}`);

						await this.setStateAsync("location.country", { val: storedLocations[CurrentPictureResult.path].country || "", ack: true });
						await this.setStateAsync("location.state", { val: storedLocations[CurrentPictureResult.path].state || "", ack: true });
						await this.setStateAsync("location.county", { val: storedLocations[CurrentPictureResult.path].county || "", ack: true });
						await this.setStateAsync("location.city", { val: storedLocations[CurrentPictureResult.path].city || "", ack: true });
						await this.setStateAsync("location.display_name", { val: storedLocations[CurrentPictureResult.path].display_name || "", ack: true });
					} else {
						const locationInfos = await nominatim.getLocationInfos(Helper, CurrentPictureResult);

						if (locationInfos && CurrentPictureResult.path) {
							storedLocations[CurrentPictureResult.path] = locationInfos;

							Helper.ReportingInfo("Debug", "Adapter", `[setLocationStates]: data downloaded (file: ${CurrentPictureResult.path}, data: ${JSON.stringify(storedLocations[CurrentPictureResult.path])}`);

							await this.setStateAsync("location.country", { val: locationInfos.country || "", ack: true });
							await this.setStateAsync("location.state", { val: locationInfos.state || "", ack: true });
							await this.setStateAsync("location.county", { val: locationInfos.county || "", ack: true });
							await this.setStateAsync("location.city", { val: locationInfos.city || "", ack: true });
							await this.setStateAsync("location.display_name", { val: locationInfos.display_name || "", ack: true });
						}
						else {
							storedLocations[CurrentPictureResult.path] = { country: "", state: "", county: "", city: "", display_name: "" };

							await this.setStateAsync("location.country", { val: "", ack: true });
							await this.setStateAsync("location.state", { val: "", ack: true });
							await this.setStateAsync("location.county", { val: "", ack: true });
							await this.setStateAsync("location.city", { val: "", ack: true });
							await this.setStateAsync("location.display_name", { val: "", ack: true });
						}
					}
				} else {
					await this.setStateAsync("location.country", { val: "", ack: true });
					await this.setStateAsync("location.state", { val: "", ack: true });
					await this.setStateAsync("location.county", { val: "", ack: true });
					await this.setStateAsync("location.city", { val: "", ack: true });
					await this.setStateAsync("location.display_name", { val: "", ack: true });
				}
			}
		} catch (error) {
			Helper.ReportingError(error as Error, "Unknown Error", "main", "setLocationStates");
		}
	}
}


if (module.parent) {
	// Export the constructor in compact mode
	module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new Slideshow(options);
} else {
	// otherwise start the instance directly
	(() => new Slideshow())();
}