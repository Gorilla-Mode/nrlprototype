import { mount } from 'svelte'
import 'maplibre-gl/dist/maplibre-gl.css'
import './styles/stylesheet.css'
import App from './App.svelte'

const app = mount(App, {
  target: document.getElementById('app')!,
})

export default app
