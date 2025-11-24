const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '/', component: () => import('pages/ConfigurarPage.vue') },
      { path: '/iniciar', component: () => import('src/pages/IniciarPage.vue') },
      { path: '/tokens', component: () => import('src/pages/TokensPage.vue') }
    ]
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue')
  }
]

export default routes
