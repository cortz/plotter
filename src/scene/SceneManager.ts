import * as THREE from 'three'
import type { TileData, PlotState, CropType, Season, BuildingData } from '../types'
import { CropManager } from '../modules/CropManager'
import { SEASON_CONFIGS } from '../modules/SeasonManager'
import { BUILDING_DEFS } from '../modules/BuildingManager'

const GRID_SIZE = 9
const TILE_SIZE = 1
const TILE_GAP = 0.06
const DRAG_THRESHOLD = 5

// Dynamic colors — updated by setSeason()
let COLORS: Record<string, number> = {
  locked: 0x7a7a7a,
  unlocked: 0x4e8c2f,
  plot_empty: 0x8b5e3c,
  plot_growing: 0x8fbe45,
  plot_harvestable: 0xffd700,
}

export class SceneManager {
  private renderer: THREE.WebGLRenderer
  private scene: THREE.Scene
  private camera: THREE.OrthographicCamera
  private ambientLight!: THREE.AmbientLight
  private tileMeshes = new Map<string, THREE.Mesh>()
  private cropMeshes = new Map<string, THREE.Mesh>()
  private raycaster = new THREE.Raycaster()
  private mouse = new THREE.Vector2()
  private canvas: HTMLCanvasElement
  private animId: number | null = null
  private isDragging = false
  private dragDist = 0
  private lastMouse = { x: 0, y: 0 }
  // Camera look target (center of 9x9 grid)
  private lookTarget = new THREE.Vector3(
    ((GRID_SIZE - 1) / 2) * (TILE_SIZE + TILE_GAP),
    0,
    ((GRID_SIZE - 1) / 2) * (TILE_SIZE + TILE_GAP)
  )
  private cameraOffset = new THREE.Vector3(12, 12, 12)
  // Isometric pan axes (right and down in screen space → world space)
  private readonly PAN_RIGHT = new THREE.Vector3(-0.707, 0, 0.707)
  private readonly PAN_DOWN = new THREE.Vector3(0.707, 0, 0.707)

  onTileClick?: (x: number, y: number) => void
  onTileHover?: (x: number, y: number) => void
  onHoverClear?: () => void

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setClearColor(0x2a4a1a)

    this.scene = new THREE.Scene()

    // Orthographic isometric camera
    const { frustumSize, aspect } = this.getFrustum()
    this.camera = new THREE.OrthographicCamera(
      (-frustumSize * aspect) / 2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      -frustumSize / 2,
      0.1,
      200
    )
    this.positionCamera()

    // Lighting
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.75)
    this.scene.add(this.ambientLight)
    const sun = new THREE.DirectionalLight(0xffffff, 0.6)
    sun.position.set(8, 15, 4)
    this.scene.add(sun)

    this.bindEvents()
  }

  private getFrustum() {
    const frustumSize = 14
    const aspect = this.canvas.clientWidth / this.canvas.clientHeight || 1
    return { frustumSize, aspect }
  }

  private positionCamera() {
    this.camera.position.copy(this.lookTarget).add(this.cameraOffset)
    this.camera.lookAt(this.lookTarget)
  }

  private bindEvents() {
    this.canvas.addEventListener('mousemove', this.onMouseMove)
    this.canvas.addEventListener('mousedown', this.onMouseDown)
    this.canvas.addEventListener('mouseup', this.onMouseUp)
    this.canvas.addEventListener('click', this.onClick)
    this.canvas.addEventListener('contextmenu', e => e.preventDefault())
    window.addEventListener('resize', this.onResize)
  }

  private onMouseDown = (e: MouseEvent) => {
    this.isDragging = true
    this.dragDist = 0
    this.lastMouse = { x: e.clientX, y: e.clientY }
  }

  private onMouseUp = () => {
    this.isDragging = false
  }

  private onMouseMove = (e: MouseEvent) => {
    const rect = this.canvas.getBoundingClientRect()
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

    if (this.isDragging) {
      const dx = e.clientX - this.lastMouse.x
      const dy = e.clientY - this.lastMouse.y
      this.dragDist += Math.sqrt(dx * dx + dy * dy)
      if (this.dragDist > DRAG_THRESHOLD) {
        const speed = 0.025
        this.lookTarget.addScaledVector(this.PAN_RIGHT, dx * speed)
        this.lookTarget.addScaledVector(this.PAN_DOWN, dy * speed)
        this.positionCamera()
      }
    }
    this.lastMouse = { x: e.clientX, y: e.clientY }

    // Hover
    this.raycaster.setFromCamera(this.mouse, this.camera)
    const hits = this.raycaster.intersectObjects([...this.tileMeshes.values()])
    if (hits.length > 0) {
      const [hx, hy] = (hits[0].object.userData.key as string).split(',').map(Number)
      this.onTileHover?.(hx, hy)
    } else {
      this.onHoverClear?.()
    }
  }

  private onClick = () => {
    if (this.dragDist > DRAG_THRESHOLD) return
    this.raycaster.setFromCamera(this.mouse, this.camera)
    const hits = this.raycaster.intersectObjects([...this.tileMeshes.values()])
    if (hits.length > 0) {
      const [cx, cy] = (hits[0].object.userData.key as string).split(',').map(Number)
      this.onTileClick?.(cx, cy)
    }
  }

  private onResize = () => {
    const w = this.canvas.clientWidth
    const h = this.canvas.clientHeight
    const { frustumSize, aspect } = this.getFrustum()
    this.camera.left = (-frustumSize * aspect) / 2
    this.camera.right = (frustumSize * aspect) / 2
    this.camera.top = frustumSize / 2
    this.camera.bottom = -frustumSize / 2
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h, false)
  }

  buildGrid(grid: TileData[][], plots: Record<string, PlotState | undefined>, buildings: Record<string, BuildingData> = {}) {
    this.tileMeshes.forEach(m => { this.scene.remove(m); m.geometry.dispose(); (m.material as THREE.Material).dispose() })
    this.cropMeshes.forEach(m => { this.scene.remove(m); m.geometry.dispose(); (m.material as THREE.Material).dispose() })
    this.tileMeshes.clear()
    this.cropMeshes.clear()

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const key = `${x},${y}`
        this.addTileMesh(grid[y][x], plots[key], buildings[key])
      }
    }
  }

  private addTileMesh(tile: TileData, plot?: PlotState, building?: BuildingData) {
    const key = `${tile.x},${tile.y}`
    const wx = tile.x * (TILE_SIZE + TILE_GAP)
    const wz = tile.y * (TILE_SIZE + TILE_GAP)

    let colorKey = tile.type as string
    if (tile.type === 'plot' && plot) colorKey = `plot_${plot.status}`
    const color = COLORS[colorKey] ?? COLORS.unlocked

    const tileH = tile.type === 'locked' ? 0.08 : 0.14
    const geo = new THREE.BoxGeometry(TILE_SIZE, tileH, TILE_SIZE)
    const mat = new THREE.MeshLambertMaterial({ color })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(wx, tileH / 2, wz)
    mesh.userData.key = key
    this.scene.add(mesh)
    this.tileMeshes.set(key, mesh)

    // Crop visual
    if (tile.type === 'plot' && plot?.cropType && plot.status !== 'empty') {
      this.addCropMesh(key, plot.cropType, plot.status, wx, wz, tileH)
    }

    // Building visual
    if (tile.type === 'building' && building) {
      this.addBuildingMesh(key, building, wx, wz, tileH)
    }
  }

  private addBuildingMesh(key: string, building: BuildingData, wx: number, wz: number, tileH: number) {
    const def = BUILDING_DEFS[building.type]
    // Base platform
    const baseGeo = new THREE.BoxGeometry(TILE_SIZE * 0.88, 0.32, TILE_SIZE * 0.88)
    const baseMat = new THREE.MeshLambertMaterial({ color: def.color })
    const base = new THREE.Mesh(baseGeo, baseMat)
    base.position.set(wx, tileH + 0.16, wz)
    base.userData.key = key
    this.scene.add(base)
    this.tileMeshes.set(`${key}_bbase`, base)

    // Tower body (animates gently)
    const bodyGeo = new THREE.BoxGeometry(TILE_SIZE * 0.48, 0.52, TILE_SIZE * 0.48)
    const bodyMat = new THREE.MeshLambertMaterial({ color: def.color })
    const body = new THREE.Mesh(bodyGeo, bodyMat)
    const bodyY = tileH + 0.32 + 0.26
    body.position.set(wx, bodyY, wz)
    body.userData.key = key
    body.userData.baseY = bodyY
    body.userData.isBuilding = true
    this.scene.add(body)
    this.cropMeshes.set(key, body)
  }

  private addCropMesh(key: string, cropType: CropType, status: PlotState['status'], wx: number, wz: number, tileH: number) {
    const def = CropManager.getCropDefinition(cropType)
    const scale = status === 'harvestable' ? 0.52 : 0.3
    const geo = new THREE.BoxGeometry(scale, scale * 1.2, scale)
    const mat = new THREE.MeshLambertMaterial({ color: def.color })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(wx, tileH + (scale * 1.2) / 2, wz)
    mesh.userData.baseY = tileH + (scale * 1.2) / 2
    mesh.userData.key = key
    this.scene.add(mesh)
    this.cropMeshes.set(key, mesh)
  }

  highlightTile(x: number, y: number) {
    const mesh = this.tileMeshes.get(`${x},${y}`)
    if (mesh) (mesh.material as THREE.MeshLambertMaterial).emissive.setHex(0x333333)
  }

  unhighlightTile(x: number, y: number) {
    const mesh = this.tileMeshes.get(`${x},${y}`)
    if (mesh) (mesh.material as THREE.MeshLambertMaterial).emissive.setHex(0x000000)
  }

  startLoop() {
    const animate = () => {
      this.animId = requestAnimationFrame(animate)
      const t = Date.now() * 0.001
      this.cropMeshes.forEach((mesh, key) => {
        const baseY = mesh.userData.baseY as number
        mesh.position.y = baseY + Math.sin(t * 1.5 + key.charCodeAt(0)) * 0.025
        mesh.rotation.y = t * 0.4
      })
      this.renderer.render(this.scene, this.camera)
    }
    animate()
  }

  stopLoop() {
    if (this.animId !== null) cancelAnimationFrame(this.animId)
    this.animId = null
  }

  resize() { this.onResize() }

  setSeason(season: Season) {
    const config = SEASON_CONFIGS[season]
    this.renderer.setClearColor(config.skyColor)
    this.ambientLight.color.setHex(config.ambientColor)
    COLORS.unlocked = config.unlockedColor
  }

  destroy() {
    this.stopLoop()
    this.canvas.removeEventListener('mousemove', this.onMouseMove)
    this.canvas.removeEventListener('mousedown', this.onMouseDown)
    this.canvas.removeEventListener('mouseup', this.onMouseUp)
    this.canvas.removeEventListener('click', this.onClick)
    window.removeEventListener('resize', this.onResize)
    this.renderer.dispose()
  }
}
