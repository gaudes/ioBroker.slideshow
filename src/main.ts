/*
 * Created with @iobroker/create-adapter v2.0.1
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
let ControlPlay = true;
// Reentrancy guard for updateCurrentPictureTimer. Rapid manual prev/next
// requests can interleave with in-flight picture loads; serialize them.
let CurrentPictureRunning = false;

// If no VIS heartbeat is seen within this window, treat the VIS view as inactive
// and skip picture loading. Heartbeats fire every 15s from the widget.
const VIS_HEARTBEAT_STALE_MS = 45000;

interface Picture{
	url: string;
	path: string;
	info1: string;
	info2: string;
	info3: string;
	date: Date | null;
	album: string;
}

interface CurrentSlideState{
	url: string;
	path: string;
	info1: string;
	info2: string;
	info3: string;
	date: number | null;
	album: string;
}

interface PictureListUpdateResult{
	success: boolean;
	picturecount: number;
}
//#endregion

class Slideshow extends utils.Adapter {

	isUnloaded: boolean;
	private lastVisHeartbeat: number = 0;

	//#region Basic Adapter Functions

	public constructor(options: Partial<utils.AdapterOptions> = {}) {
		super({
			...options,
			name: "slideshow",
		});
		this.on("ready", this.onReady.bind(this));
		this.on("stateChange", this.onStateChange.bind(this));
		this.on("message", this.onMessage.bind(this));
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
			// Create button for play
			await this.setObjectNotExistsAsync("control_play", {
				type: "state",
				common: {
					name: "control_play",
					type: "boolean",
					role: "button",
					read: true,
					write: true,
					desc: "Play slideshow",
					def: false
				},
				native: {},
			});
			await this.setStateAsync("control_play", false, true);
			// Create button for stop
			await this.setObjectNotExistsAsync("control_stop", {
				type: "state",
				common: {
					name: "control_stop",
					type: "boolean",
					role: "button",
					read: true,
					write: true,
					desc: "Stop slideshow",
					def: false
				},
				native: {},
			});
			await this.setStateAsync("control_stop", false, true);
			// Create button for previous picture
			await this.setObjectNotExistsAsync("control_previous", {
				type: "state",
				common: {
					name: "control_previous",
					type: "boolean",
					role: "button",
					read: true,
					write: true,
					desc: "Show previous picture",
					def: false
				},
				native: {},
			});
			await this.setStateAsync("control_previous", false, true);
			// Create button for next picture
			await this.setObjectNotExistsAsync("control_next", {
				type: "state",
				common: {
					name: "control_next",
					type: "boolean",
					role: "button",
					read: true,
					write: true,
					desc: "Show next picture",
					def: false
				},
				native: {},
			});
			await this.setStateAsync("control_next", false, true);
			// Expose the cycling interval in ms so the widget can drive a progress bar
			await this.setObjectNotExistsAsync("info.update_interval_ms", {
				type: "state",
				common: {
					name: "info.update_interval_ms",
					type: "number",
					role: "value.interval",
					read: true,
					write: false,
					desc: "Current picture cycling interval in milliseconds"
				},
				native: {},
			});
			await this.setStateAsync("info.update_interval_ms", { val: this.config.update_interval * 1000, ack: true });
			// Create State for State
			await this.setObjectNotExistsAsync("state", {
				type: "state",
				common: {
					name: "state",
					type: "string",
					role: "state",
					read: true,
					write: false,
					desc: "Current state",
					def: false
				},
				native: {},
			});
			await this.setStateAsync("state", { val: "play", ack: true });
			// Heartbeat state — VIS widget writes to this periodically while a view with the
			// widget is open. If it goes stale, the adapter pauses picture cycling.
			await this.setObjectNotExistsAsync("vis_heartbeat", {
				type: "state",
				common: {
					name: "vis_heartbeat",
					type: "number",
					role: "indicator",
					read: true,
					write: true,
					desc: "Timestamp of last VIS widget heartbeat (ms)",
					def: 0
				},
				native: {},
			});
			const prevHeartbeat = await this.getStateAsync("vis_heartbeat");
			this.lastVisHeartbeat = typeof prevHeartbeat?.val === "number" ? prevHeartbeat.val : 0;

			this.subscribeStates("updatepicturelist");
			this.subscribeStates("control_*");
			this.subscribeStates("vis_heartbeat");

			// Refresh album list once at startup (Synology provider only)
			if (this.config.provider === 4) {
				await this.refreshSynoAlbumList();
			}

			// Starting updatePictureStoreTimer action
			await this.updatePictureStoreTimer();
		}catch(err){
			Helper.ReportingError(err as Error, MsgErrUnknown, "onReady");
		}
	}

	/**
	 * Is called if a subscribed state changes
	 */
	private async onStateChange(id: string, state: ioBroker.State | null | undefined): Promise<void> {
		if (state) {
			if (id === `${this.namespace}.vis_heartbeat` && state?.ack === false){
				const ts = typeof state.val === "number" ? state.val : 0;
				if (ts > 0) {
					this.lastVisHeartbeat = ts;
					await this.setStateAsync("vis_heartbeat", { val: ts, ack: true });
				}
				return;
			}
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
			if (id === `${this.namespace}.control_play` && state?.val === true && state?.ack === false){
				if (ControlPlay === false){
					Helper.ReportingInfo("Info", "Adapter", "Start slideshow per control");
					this.updateCurrentPictureTimer();
					ControlPlay = true;
					await this.setObjectNotExistsAsync("state", {
						type: "state",
						common: {
							name: "state",
							type: "string",
							role: "state",
							read: true,
							write: false,
							desc: "Current state"
						},
						native: {},
					});
					await this.setStateAsync("state", { val: "play", ack: true });
					await this.setStateAsync("control_play", false, false);
				}
			}
			if (id === `${this.namespace}.control_previous` && state?.val === true && state?.ack === false){
				await this.setStateAsync("control_previous", false, false);
				await this.triggerManualNav(-1);
				return;
			}
			if (id === `${this.namespace}.control_next` && state?.val === true && state?.ack === false){
				await this.setStateAsync("control_next", false, false);
				await this.triggerManualNav(1);
				return;
			}
			if (id === `${this.namespace}.control_stop` && state?.val === true && state?.ack === false){
				if (ControlPlay === true){
					Helper.ReportingInfo("Info", "Adapter", "Stop slideshow per control");
					clearTimeout(this.tUpdateCurrentPictureTimeout);
					ControlPlay = false;
					await this.setObjectNotExistsAsync("state", {
						type: "state",
						common: {
							name: "state",
							type: "string",
							role: "state",
							read: true,
							write: false,
							desc: "Current state"
						},
						native: {},
					});
					await this.setStateAsync("state", { val: "stop", ack: true });
					await this.setStateAsync("control_stop", false, false);
				}
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

	/**
	 * Fetch the Synology album list and store it in state info.albums as JSON.
	 * Called on adapter start (if provider = Synology) and on 'listAlbums' sendTo message.
	 */
	private async refreshSynoAlbumList(): Promise<slideSyno.SynoAlbum[]> {
		try {
			const albums = await slideSyno.getAlbumList(Helper);
			await this.setObjectNotExistsAsync("info.albums", {
				type: "state",
				common: {
					name: "info.albums",
					type: "string",
					role: "json",
					read: true,
					write: false,
					desc: "Synology albums discovered at adapter start"
				},
				native: {},
			});
			const payload = albums.map(a => ({ name: a.name, space: a.space }));
			await this.setStateAsync("info.albums", { val: JSON.stringify(payload), ack: true });
			Helper.ReportingInfo("Info", "Adapter", `Synology album list refreshed: ${albums.length} albums`);
			return albums;
		} catch (err) {
			Helper.ReportingError(err as Error, MsgErrUnknown, "refreshSynoAlbumList");
			return [];
		}
	}

	/**
	 * Is called if a message is sent to this instance (e.g. from the admin config page)
	 */
	private async onMessage(obj: ioBroker.Message): Promise<void> {
		if (!obj || !obj.command) return;
		if (obj.command === "listAlbums") {
			slideSyno.invalidateSession();
			const albums = await this.refreshSynoAlbumList();
			const payload = albums.map(a => ({ name: a.name, space: a.space }));
			if (obj.callback) {
				this.sendTo(obj.from, obj.command, payload, obj.callback);
			}
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
			Helper.ReportingError(err as Error, MsgErrUnknown, "updatePictureStoreTimer", "Clear Timer");
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
			Helper.ReportingError(err as Error, MsgErrUnknown, "updatePictureStoreTimer", "Call Timer Action");
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
			Helper.ReportingError(err as Error, MsgErrUnknown, "updatePictureStoreTimer", "Set Timer");
		}
		UpdateRunning = false;
	}

	/**
	 * Manual prev/next navigation from VIS widget or a control state.
	 * Bumps the heartbeat (so a pause state doesn't swallow the input),
	 * cancels the running timer, and advances the picture in the given
	 * direction. Reschedules only if the slideshow is currently playing.
	 */
	private async triggerManualNav(direction: 1 | -1): Promise<void> {
		Helper.ReportingInfo("Debug", "Adapter", `Manual navigation, direction=${direction}`);
		// Treat a manual click as proof that a client is active so a stale
		// heartbeat doesn't cause the navigation to no-op.
		this.lastVisHeartbeat = Date.now();
		try {
			this.tUpdateCurrentPictureTimeout && clearTimeout(this.tUpdateCurrentPictureTimeout);
		} catch (err) {
			Helper.ReportingError(err as Error, MsgErrUnknown, "triggerManualNav", "Clear Timer");
		}
		await this.updateCurrentPictureTimer(direction);
	}

	private async updateCurrentPictureTimer(direction: 1 | -1 = 1): Promise<void>{
		if (CurrentPictureRunning === true){
			Helper.ReportingInfo("Debug", "Adapter", "updateCurrentPictureTimer skipped, already running");
			return;
		}
		CurrentPictureRunning = true;
		let CurrentPictureResult: Picture | null = null;
		let Provider = "";
		Helper.ReportingInfo("Debug", "Adapter", `updateCurrentPictureTimer occured (direction=${direction})`);
		try{
			this.tUpdateCurrentPictureTimeout && clearTimeout(this.tUpdateCurrentPictureTimeout);
		}catch(err){
			Helper.ReportingError(err as Error, MsgErrUnknown, "updateCurrentPictureTimer", "Clear Timer");
		}

		// Pause when no VIS view with the widget is active. Only activates after we've
		// seen at least one heartbeat — on a fresh install we run until a client connects.
		if (this.lastVisHeartbeat > 0 && (Date.now() - this.lastVisHeartbeat) > VIS_HEARTBEAT_STALE_MS) {
			Helper.ReportingInfo("Debug", "Adapter", `Paused (VIS heartbeat stale, last seen ${new Date(this.lastVisHeartbeat).toISOString()})`);
			if (this.isUnloaded === false) {
				this.tUpdateCurrentPictureTimeout = setTimeout(() => {
					this.updateCurrentPictureTimer();
				}, (this.config.update_interval * 1000));
			}
			CurrentPictureRunning = false;
			return;
		}

		try{
			switch(this.config.provider){
				case 1:
					CurrentPictureResult = await slideBing.getPicture(Helper, direction);
					Provider = "Bing";
					break;
				case 2:
					CurrentPictureResult = await slideLocal.getPicture(Helper, direction);
					Provider = "Local";
					break;
				case 3:
					CurrentPictureResult = await slideFS.getPicture(Helper, direction);
					Provider = "FileSystem";
					break;
				case 4:
					CurrentPictureResult = await slideSyno.getPicture(Helper, direction);
					Provider = "Synology";
					break;
			}
		}catch(err){
			Helper.ReportingError(err as Error, MsgErrUnknown, "updateCurrentPictureTimer", "Call Timer Action");
		}
		try{
			if (CurrentPictureResult !== null && this.isUnloaded === false){
				Helper.ReportingInfo("Debug", Provider, `Set picture to ${CurrentPictureResult.path}`);
				// Write all metadata before the picture state. The widget listens
				// on picture as its repaint trigger, so picture must be last.
				await this.setObjectNotExistsAsync("info1", {
					type: "state",
					common: { name: "info1", type: "string", role: "text", read: true, write: false, desc: "Info 1 for picture" },
					native: {},
				});
				await this.setObjectNotExistsAsync("info2", {
					type: "state",
					common: { name: "info2", type: "string", role: "text", read: true, write: false, desc: "Info 2 for picture" },
					native: {},
				});
				await this.setObjectNotExistsAsync("info3", {
					type: "state",
					common: { name: "info3", type: "string", role: "text", read: true, write: false, desc: "Info 3 for picture" },
					native: {},
				});
				await this.setObjectNotExistsAsync("info_album", {
					type: "state",
					common: { name: "info_album", type: "string", role: "text", read: true, write: false, desc: "Album of picture" },
					native: {},
				});
				await this.setObjectNotExistsAsync("date", {
					type: "state",
					common: { name: "date", type: "number", role: "date", read: true, write: false, desc: "Date of picture" },
					native: {},
				});
				await this.setObjectNotExistsAsync("picture", {
					type: "state",
					common: { name: "picture", type: "string", role: "text", read: true, write: false, desc: "Current picture" },
					native: {},
				});
				await this.setObjectNotExistsAsync("current_slide", {
					type: "state",
					common: { name: "current_slide", type: "string", role: "json", read: true, write: false, desc: "Current slide payload with image and metadata" },
					native: {},
				});
				const currentSlide: CurrentSlideState = {
					url: CurrentPictureResult.url,
					path: CurrentPictureResult.path,
					info1: CurrentPictureResult.info1,
					info2: CurrentPictureResult.info2,
					info3: CurrentPictureResult.info3,
					date: CurrentPictureResult.date?.getTime() || null,
					album: CurrentPictureResult.album || "",
				};
				await this.setStateAsync("current_slide", { val: JSON.stringify(currentSlide), ack: true });
				await this.setStateAsync("info1", { val: CurrentPictureResult.info1, ack: true });
				await this.setStateAsync("info2", { val: CurrentPictureResult.info2, ack: true });
				await this.setStateAsync("info3", { val: CurrentPictureResult.info3, ack: true });
				await this.setStateAsync("info_album", { val: CurrentPictureResult.album || "", ack: true });
				await this.setStateAsync("date", { val: CurrentPictureResult.date?.getTime() || null, ack: true });
				await this.setStateAsync("picture", { val: CurrentPictureResult.url, ack: true });
			}
		}catch(err){
			Helper.ReportingError(err as Error, MsgErrUnknown, "updateCurrentPictureTimer", "Call Timer Action");
		}
		try{
			// Only reschedule if the slideshow is currently playing. Manual
			// prev/next while stopped changes the picture without resuming the cycle.
			if (ControlPlay === true && this.isUnloaded === false){
				this.tUpdateCurrentPictureTimeout = setTimeout(() => {
					this.updateCurrentPictureTimer();
				}, (this.config.update_interval * 1000));
			}
		}catch(err){
			Helper.ReportingError(err as Error, MsgErrUnknown, "updateCurrentPictureTimer", "Set Timer");
		}
		CurrentPictureRunning = false;
	}

}

if (module.parent) {
	// Export the constructor in compact mode
	module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new Slideshow(options);
} else {
	// otherwise start the instance directly
	(() => new Slideshow())();
}
