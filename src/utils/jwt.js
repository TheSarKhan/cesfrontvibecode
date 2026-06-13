/** JWT payload-ı decode edir */
export const decodeToken = (token) => {
  if (!token) return null
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return null
  }
}

/** Token-ın vaxtı bitibsə true qaytarır */
export const isTokenExpired = (token) => {
  const decoded = decodeToken(token)
  if (!decoded?.exp) return true
  return decoded.exp < Math.floor(Date.now() / 1000)
}
