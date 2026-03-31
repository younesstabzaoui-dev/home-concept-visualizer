// URL du backend selon l'environnement
// En dev : proxy Vite vers localhost:3002
// En prod : URL Render (à renseigner après déploiement)
const API_BASE = import.meta.env.VITE_API_URL || ''

export default API_BASE
