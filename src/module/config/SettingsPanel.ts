import FloatingPanelMixin from '@/module/config/FloatingPanelMixin';
import GeneralSettings from '@/module/config/GeneralSettings.vue';
import ConfigModule from '@/module/config/index';
import { Component, Mixins, Prop, Ref } from 'vue-property-decorator';

@Component
export default class SettingsPanel extends Mixins(FloatingPanelMixin) {
    // use getter function to prevent Vue's observation on ConfigModule instance
    @Prop() readonly configModule!: () => ConfigModule;

    @Ref('settings') readonly panel!: HTMLDivElement;
    @Ref('content') readonly content!: HTMLDivElement;
    @Ref('toolbar') readonly handle!: HTMLDivElement;

    readonly tabs = ['General'];
    readonly pages = [GeneralSettings];

    selectedTab = 0;

    get currentPage() {
        return this.pages[this.selectedTab];
    }

    get cachedConfigModule() {
        return this.configModule();
    }

    protected mounted() {
        // TODO: use theme color from Wallpaper Engine properties
        document.documentElement.style.setProperty('--accentColor', '#AB47BC');

        this.switchTop = this.cachedConfigModule.getConfig('settings.switchTop', this.switchTop);
        this.switchLeft = this.cachedConfigModule.getConfig('settings.switchLeft', this.switchLeft);

        this.panelTop = this.cachedConfigModule.getConfig('settings.panelTop', this.panelTop);
        this.panelLeft = this.cachedConfigModule.getConfig('settings.panelLeft', this.panelLeft);
    }

    protected switchMoveEnded() {
        this.cachedConfigModule.setConfig('settings.switchTop', this.switchTop);
        this.cachedConfigModule.setConfig('settings.switchLeft', this.switchLeft);
    }

    protected panelMoveEnded() {
        this.cachedConfigModule.setConfig('settings.panelTop', this.panelTop);
        this.cachedConfigModule.setConfig('settings.panelLeft', this.panelLeft);
    }

    refresh() {
        location.reload();
    }
}
