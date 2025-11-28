import { defineBoot } from '#q-app/wrappers'
import axios from 'axios'
const baseURL = 'http://localhost:10000'
const api = axios.create({ baseURL: baseURL })
console.log('🟢 API -> ' + baseURL)
export default defineBoot(({ app }) => {
  app.config.globalProperties.$axios = axios
  app.config.globalProperties.$api = api
})

export { api }
