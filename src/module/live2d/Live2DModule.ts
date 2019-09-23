import { App, Module } from '@/App';
import { error } from '@/core/utils/log';
import Live2DPlayer from '@/module/live2d/Live2DPlayer';
import { resolve as urlResolve } from 'url';

const TAG = 'Live2DModule';

export default class Live2DModule implements Module {
    name = 'Live2D';

    player!: Live2DPlayer;

    constructor(app: App) {
        this.player = new Live2DPlayer(app.mka!);
        app.mka!.addPlayer('live2d', this.player);

        this.loadModels();
    }

    loadModels() {
        const basePath = process.env.VUE_APP_LIVE2D_PATH + '/';
        const models = process.env.VUE_APP_LIVE2D_MODELS;

        if (basePath && models) {
            models.split(',').forEach(model => {
                this.player.addSprite(urlResolve(basePath, model)).catch(e => {
                    // TODO: Show friendly error message
                    error(TAG, e);
                });
            });
        }
    }
}