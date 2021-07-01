/*
 * Created with @iobroker/create-adapter v1.31.0
 */

//#region Imports, Variables and Global
import * as utils from "@iobroker/adapter-core";
import {GlobalHelper} from "./modules/global-helper";
import * as slideBing from "./modules/slideBing";
import * as slideLocal from "./modules/slideLocal";
import * as slideFS from "./modules/slideFS";
import * as slideSyno from "./modules/slideSynology"

let Helper: GlobalHelper;
const MsgErrUnknown = "Unknown Error";
let UpdateRunning = false;

interface Picture{
	url: string;
	path: string;
	info1: string;
	info2: string;
	info3: string;
	date: Date | null ;
}

interface PictureListUpdateResult{
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
		try{
			// Init Helper
			Helper = new GlobalHelper(this);

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
		}catch(err){
			Helper.ReportingError(err, MsgErrUnknown, "onReady");
		}
	}

	/**
	 * Is called if a subscribed state changes
	 */
	private async onStateChange(id: string, state: ioBroker.State | null | undefined): Promise<void> {
		if (state) {
			if (id === `${this.namespace}.updatepicturelist` && state?.val === true && state?.ack === false){
				if (UpdateRunning === true){
					Helper.ReportingInfo("Info", "Adapter", "Update picture list already running");
				}else{
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

	private async updatePictureStoreTimer(): Promise<void>{
		UpdateRunning = true;
		let updatePictureStoreResult: PictureListUpdateResult = { success: false, picturecount: 0};
		Helper.ReportingInfo("Debug", "Adapter", "UpdatePictureStoreTimer occured");
		try{
			this.tUpdatePictureStoreTimeout && clearTimeout(this.tUpdatePictureStoreTimeout);
		}catch(err){
			Helper.ReportingError(err, MsgErrUnknown, "updatePictureStoreTimer", "Clear Timer");
		}
		try{
			switch(this.config.provider){
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
		}catch(err){
			Helper.ReportingError(err, MsgErrUnknown, "updatePictureStoreTimer", "Call Timer Action");
		}
		try{
			if (this.config.update_picture_list && this.config.update_picture_list > 0 && updatePictureStoreResult.success === true){
				Helper.ReportingInfo("Debug", "updatePictureStoreTimer", `Update every ${this.config.update_picture_list} hours, starting timer`);
				this.tUpdatePictureStoreTimeout = setTimeout(() => {
					this.updatePictureStoreTimer();
				}, (this.config.update_picture_list * 3600000)); // Update every configured hours if successfull
			}else if (updatePictureStoreResult.success === false){
				this.tUpdatePictureStoreTimeout = setTimeout(() => {
					this.updatePictureStoreTimer();
				}, (this.config.update_interval * 300000)); // Update every minute if error
			}
			if (updatePictureStoreResult.success === true && updatePictureStoreResult.picturecount > 0 && this.isUnloaded === false){
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
		}catch(err){
			Helper.ReportingError(err, MsgErrUnknown, "updatePictureStoreTimer", "Set Timer");
		}
		UpdateRunning = false;
	}

	private async updateCurrentPictureTimer(): Promise<void>{
		let CurrentPictureResult: Picture | null = null;
		let Provider = "";
		Helper.ReportingInfo("Debug", "Adapter", "updateCurrentPictureTimer occured");
		try{
			this.tUpdateCurrentPictureTimeout && clearTimeout(this.tUpdateCurrentPictureTimeout);
		}catch(err){
			Helper.ReportingError(err, MsgErrUnknown, "updateCurrentPictureTimer", "Clear Timer");
		}
		try{
			switch(this.config.provider){
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
		}catch(err){
			Helper.ReportingError(err, MsgErrUnknown, "updateCurrentPictureTimer", "Call Timer Action");
		}
		try{
			if (CurrentPictureResult !== null && this.isUnloaded === false){
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
				await this.setStateAsync("date", { val: CurrentPictureResult.date?.getTime() || null , ack: true });
			}
		}catch(err){
			Helper.ReportingError(err, MsgErrUnknown, "updateCurrentPictureTimer", "Call Timer Action");
		}
		try{
			this.tUpdateCurrentPictureTimeout = setTimeout(() => {
				this.updateCurrentPictureTimer();
			}, (this.config.update_interval * 1000));
		}catch(err){
			Helper.ReportingError(err, MsgErrUnknown, "updateCurrentPictureTimer", "Set Timer");
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