import { SafeArea } from '@/core/utils/dom';
import Live2DSprite from '@/module/live2d/Live2DSprite';

export interface ModelConfig {
    readonly file: string | string[];
    id: number;
    enabled: boolean;
    scale: number;
    x: number;
    y: number;
    order: number;
    locale?: string; // the subtitle locale
    preview?: string; // image file
}

export const DEFAULT_MODEL_CONFIG: Omit<ModelConfig, 'id' | 'file' | 'order'> = {
    enabled: true,
    scale: 1 / innerHeight,
    x: 0.5,
    y: 0.5,
};

export namespace ModelConfigUtils {
    export let containerWidth = SafeArea.area.width;
    export let containerHeight = SafeArea.area.height;

    export function toStorageValues<T extends Partial<ModelConfig>>(config: T): T {
        const _config = Object.assign({}, config);

        if (_config.scale !== undefined) _config.scale /= containerHeight;
        if (_config.x !== undefined) _config.x /= containerWidth;
        if (_config.y !== undefined) _config.y /= containerHeight;

        return _config;
    }

    export function toActualValues<T extends Partial<ModelConfig>>(config: T): T {
        const _config = Object.assign({}, config);

        if (_config.scale !== undefined) _config.scale *= containerHeight;
        if (_config.x !== undefined) _config.x *= containerWidth;
        if (_config.y !== undefined) _config.y *= containerHeight;

        return _config;
    }

    export function configureSprite(sprite: Live2DSprite, config: Partial<ModelConfig>) {
        const _config = toActualValues(config);

        if (!isNaN(_config.scale!)) {
            const oldWidth = sprite.width;
            const oldHeight = sprite.height;

            sprite.scale.x = sprite.scale.y = _config.scale!;

            sprite.x -= (sprite.width - oldWidth) / 2;
            sprite.y -= (sprite.height - oldHeight) / 2;
        }

        if (!isNaN(_config.x!)) sprite.x = _config.x! - sprite.width / 2;
        if (!isNaN(_config.y!)) sprite.y = _config.y! - sprite.height / 2;
        if (!isNaN(_config.order!)) sprite.zIndex = _config.order!;
    }
}
