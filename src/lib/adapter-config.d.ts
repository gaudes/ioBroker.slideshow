// This file extends the AdapterConfig type from "@types/iobroker"

// Augment the globally declared type ioBroker.AdapterConfig
declare global {
	namespace ioBroker {
		interface AdapterConfig {
			provider: number;
			update_interval: number;
			update_picture_list: number;
			sentry_disable: boolean;
			fs_path: string;
			fs_format: number;
			fs_order: number;
			syno_path: string;
			syno_version: number;
			syno_username: string;
			syno_userpass: string;
			syno_format: number;
			syno_order: number;
		}
	}
}

// this is required so the above AdapterConfig is found by TypeScript / type checking
export {};