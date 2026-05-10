import { useEffect } from 'react'
import { gsap } from 'gsap'

/**
 * Attach a magnetic GSAP effect to a ref'd element.
 * The element shifts toward the cursor while hovered, then springs back.
 *
 * @param {React.RefObject} ref   - ref attached to the button/element
 * @param {number} strength       - how far the element moves (0–1 fraction of half-size)
 */
export function useMagneticButton(ref, strength = 0.42) {
  useEffect(() => {
    const el = ref?.current
    if (!el) return

    const onMove = (e) => {
      const rect = el.getBoundingClientRect()
      const relX = e.clientX - (rect.left + rect.width  / 2)
      const relY = e.clientY - (rect.top  + rect.height / 2)
      gsap.to(el, {
        x: relX * strength,
        y: relY * strength,
        duration: 0.35,
        ease: 'power2.out',
        overwrite: 'auto',
      })
    }

    const onLeave = () => {
      gsap.to(el, {
        x: 0,
        y: 0,
        duration: 0.65,
        ease: 'elastic.out(1, 0.45)',
        overwrite: 'auto',
      })
    }

    el.addEventListener('mousemove', onMove)
    el.addEventListener('mouseleave', onLeave)
    return () => {
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseleave', onLeave)
    }
  }, [ref, strength])
}

/**
 * Apply the magnetic effect to every element matching a CSS selector
 * within a container element. Useful for a list of buttons rendered by map().
 *
 * @param {React.RefObject} containerRef
 * @param {string} selector
 * @param {number} strength
 */
export function useMagneticGroup(containerRef, selector = 'button, a', strength = 0.38) {
  useEffect(() => {
    const container = containerRef?.current
    if (!container) return

    const cleanups = []

    const attach = (el) => {
      const onMove = (e) => {
        const rect = el.getBoundingClientRect()
        const relX = e.clientX - (rect.left + rect.width  / 2)
        const relY = e.clientY - (rect.top  + rect.height / 2)
        gsap.to(el, {
          x: relX * strength,
          y: relY * strength,
          duration: 0.32,
          ease: 'power2.out',
          overwrite: 'auto',
        })
      }
      const onLeave = () => {
        gsap.to(el, {
          x: 0,
          y: 0,
          duration: 0.60,
          ease: 'elastic.out(1, 0.45)',
          overwrite: 'auto',
        })
      }
      el.addEventListener('mousemove', onMove)
      el.addEventListener('mouseleave', onLeave)
      cleanups.push(() => {
        el.removeEventListener('mousemove', onMove)
        el.removeEventListener('mouseleave', onLeave)
      })
    }

    const els = container.querySelectorAll(selector)
    els.forEach(attach)

    return () => cleanups.forEach((fn) => fn())
  })
}
