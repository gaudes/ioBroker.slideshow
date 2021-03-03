// This file extends the AdapterConfig type from "@types/iobroker"

// Augment the globally declared type ioBroker.AdapterConfig
declare global {
	namespace ioBroker {
		interface AdapterConfig {
			provider: number;
			update_interval: number;
			sentry_disable: boolean;
			fs_path: string;
			fs_format: number;
			syno_path: string;
			syno_username: string;
			syno_userpass: string;
			syno_order: number;
			syno_format: number;
		}
	}
}

// this is required so the above AdapterConfig is found by TypeScript / type checking
export {};