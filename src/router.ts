import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('./views/HomeView.vue'),
      meta: { title: '首页' },
    },
    {
      path: '/library',
      name: 'all',
      component: () => import('./views/AllTracksView.vue'),
      meta: { title: '全部歌曲' },
    },
    {
      path: '/albums',
      name: 'albums',
      component: () => import('./views/AlbumsView.vue'),
      meta: { title: '专辑' },
    },
    {
      path: '/album/:key',
      name: 'album',
      component: () => import('./views/AlbumDetailView.vue'),
      meta: { title: '专辑详情' },
    },
    {
      path: '/artists',
      name: 'artists',
      component: () => import('./views/ArtistsView.vue'),
      meta: { title: '歌手' },
    },
    {
      path: '/artist/:name',
      name: 'artist',
      component: () => import('./views/ArtistDetailView.vue'),
      meta: { title: '歌手详情' },
    },
    {
      path: '/favorites',
      name: 'favorites',
      component: () => import('./views/FavoritesView.vue'),
      meta: { title: '我的收藏' },
    },
    {
      path: '/recent',
      name: 'recent',
      component: () => import('./views/RecentView.vue'),
      meta: { title: '最近播放' },
    },
    {
      path: '/playlists',
      name: 'playlists',
      component: () => import('./views/PlaylistsView.vue'),
      meta: { title: '我的歌单' },
    },
    {
      path: '/playlist/:id',
      name: 'playlist',
      component: () => import('./views/PlaylistDetailView.vue'),
      meta: { title: '歌单' },
    },
    {
      path: '/search',
      name: 'search',
      component: () => import('./views/SearchView.vue'),
      meta: { title: '搜索' },
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

router.afterEach((to) => {
  const title = (to.meta.title as string | undefined) ?? 'SMusic'
  document.title = title === 'SMusic' ? title : `${title} · SMusic`
})

export default router
