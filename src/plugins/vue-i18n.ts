import { LOCALE } from '@/defaults';
import Vue from 'vue';
import VueI18n from 'vue-i18n';

Vue.use(VueI18n);

const i18n = new VueI18n({
    fallbackLocale: LOCALE,
    silentFallbackWarn: true,
    messages: process.env.I18N as any,
});

export default i18n;
