// App entry point.
// Creates the Vue app, attaches the router (page navigation), loads the global
// styles (design tokens + Tailwind), and mounts everything into <div id="app">.
// Note: no Pinia/state library yet — there's no app state to manage in this
// foundation. We'll add it back when real pages need shared state.
import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import './assets/index.css'

createApp(App).use(router).mount('#app')
