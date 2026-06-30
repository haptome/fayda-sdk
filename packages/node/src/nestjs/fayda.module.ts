import {
  DynamicModule,
  Module,
  Provider,
} from "@nestjs/common";
import { FaydaClientConfig } from "../config.js";
import { FaydaService } from "./fayda.service.js";

export interface FaydaModuleAsyncOptions {
  useFactory: (
    ...args: any[]
  ) => Promise<FaydaClientConfig> | FaydaClientConfig;
  inject?: any[];
}

@Module({})
export class FaydaModule {
  static forRoot(config: FaydaClientConfig): DynamicModule {
    return {
      module: FaydaModule,
      providers: [
        { provide: "FAYDA_CONFIG", useValue: config },
        FaydaService,
      ],
      exports: [FaydaService],
      global: true,
    };
  }

  static forRootAsync(options: FaydaModuleAsyncOptions): DynamicModule {
    const configProvider: Provider = {
      provide: "FAYDA_CONFIG",
      useFactory: options.useFactory,
      inject: options.inject ?? [],
    };

    return {
      module: FaydaModule,
      providers: [configProvider, FaydaService],
      exports: [FaydaService],
      global: true,
    };
  }
}
