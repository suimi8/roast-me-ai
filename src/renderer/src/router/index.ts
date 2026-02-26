import { createRouter, createWebHashHistory } from 'vue-router'
import MainSettings from '../views/MainSettings.vue'
import RoastAlert from '../views/RoastAlert.vue'

const router = createRouter({
    history: createWebHashHistory(),
    routes: [
        {
            path: '/',
            name: 'settings',
            component: MainSettings
        },
        {
            path: '/roast',
            name: 'roast',
            component: RoastAlert
        }
    ]
})

export default router
