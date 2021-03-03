import * as SentryObj from "@sentry/types";

export class GlobalHelper{
	Adapter: ioBroker.Adapter;
	Sentry?: SentryObj.Hub;

	constructor(adapterInstance: ioBroker.Adapter){
		this.Adapter = adapterInstance;
		// Init Sentry
		if (this.Adapter.supportsFeature && this.Adapter.supportsFeature("PLUGINS")) {
			const sentryInstance: ioBroker.Plugin|null  = this.Adapter.getPluginInstance("sentry");
			if (sentryInstance) {
				this.Sentry = sentryInstance.getSentryObject();
			}
		}
	}

	//#region Helper Function ReportingError
	/**
	 * Function for global error reporting
	 * @param {Error} Err Error-Object
	 * @param {string} FriendlyError Error message for user
	 * @param {string} NameFunction Name of the function where error occured
	 * @param {string} NameAction Name of the subfunction where error occured
	 * @param {string} Info Contextual information
	 * @param {boolean} ReportSentry Report error to sentry, default true
	 */
	async ReportingError(Err: Error|null, FriendlyError: string, NameFunction: string, NameAction = "", Info = "", ReportSentry = true): Promise<void>{
		try{
			let sErrMsg = `Error occured: ${FriendlyError} in ${NameFunction}`;
			if (NameAction !== "") sErrMsg = sErrMsg + `(${NameAction})`;
			if (Err !== null) sErrMsg = sErrMsg + ` [${Err}] [${Info}]`;
			this.Adapter.log.error(sErrMsg);
		} catch (e){
			this.Adapter.log.error(`Exception in ErrorReporting [${e}]`);
		}
		// Sentry reporting
		try{
			if (this.Sentry && this.Adapter.config.sentry_disable === false && ReportSentry === true) {
				this.Sentry && this.Sentry.withScope(scope => {
					scope.setLevel(SentryObj.Severity.Error);
					scope.setExtra("NameFunction", NameFunction);
					scope.setExtra("NameAction", NameAction);
					if (Info){
						scope.setExtra("Info", Info);
					}
					//scope.setExtra("Config", this.config);
					if (this.Sentry){
						this.Sentry.captureException(Err);
					}
				});
			}
		} catch (e){
			this.Adapter.log.error(`Exception in ErrorReporting Sentry [${e}]`);
		}
	}
	//#endregion

	//#region Helper Function ReportingInfo
	/**
	 * Function for global information reporting
	 * @param {"Info"|"Debug"} Level Level for ioBroker Logging
	 * @param {string} Category Category of information
	 * @param {string} Message Message
	 * @param {{[Key: string]: any}|undefined} Data Contextual data information
	 */
	ReportingInfo(Level: "Info"|"Debug", Category: string, Message: string, Data?:{[Key: string]: any}|undefined): void {
		let iobMessage = Message;
		if (this.Adapter.log.level === "debug" || this.Adapter.log.level === "silly"){
			iobMessage = `[${Category}] ${Message}`;
		}
		switch(Level){
			case "Debug":
				this.Adapter.log.debug(iobMessage);
				break;
			default:
				this.Adapter.log.info(iobMessage);
				break;
		}
		this.Sentry?.addBreadcrumb({
			category: Category,
			message: Message,
			level: Level as SentryObj.Severity,
			data: Data
		})
	}
	//#endregion
}