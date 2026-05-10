import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { useMagneticGroup } from '../hooks/useMagneticButton'
import './TextInput.css'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://gdg26.onrender.com'

// ── DEV PLACEHOLDER ───────────────────────────────────────────────────────────
// Bypasses the backend and returns a static graph so you can develop without
// hitting the Gemini rate limit.
//
// TO UNDO WHEN DEPLOYING:
//   1. Delete the PLACEHOLDER_GRAPH constant below.
//   2. Set USE_PLACEHOLDER = false  (or just delete the entire block).
//   3. The handleSubmit function will automatically use the real backend again.
// ─────────────────────────────────────────────────────────────────────────────
const USE_PLACEHOLDER = true
const PLACEHOLDER_GRAPH = {"nodes":[{"id":"root_math2130","title":"MATH2130 Numerical Methods","content":"MATH2130 Numerical Methods is a core engineering mathematics course at the University of Guelph that teaches students how to solve mathematical problems computationally when exact analytical solutions are impractical or impossible. The course covers a broad range of techniques including root-finding, optimization, interpolation, numerical integration, solving ordinary differential equations, and numerical differentiation. Students learn to analyze and quantify the errors inherent in these approximations, understand convergence behavior, and select the most appropriate algorithm for a given problem. The unifying theme is the use of iterative and discrete methods to approximate continuous mathematical objects — a skill fundamental to scientific computing, simulation, and engineering analysis.","connected":["unit_background","unit_roots","unit_optimization","unit_interpolation","unit_integration","unit_ivp","unit_differentiation"],"importance":5},{"id":"unit_background","title":"Mathematical Background","content":"The Mathematical Background unit lays the essential theoretical groundwork for all numerical methods studied in the course. It covers error analysis (absolute and relative), key theorems from calculus (IVT and MVT), Taylor series expansions used to derive and bound errors in approximations, Big-O asymptotic notation for comparing algorithm efficiency, and the practical realities of floating-point arithmetic in computer systems. A solid understanding of this unit is critical because every subsequent numerical method builds on these ideas — convergence rates are described in Big-O terms, error bounds come from Taylor remainders, and the IVT underpins the correctness of bracketing methods like bisection.","connected":["node_error_abs","node_error_rel","node_ivt","node_mvt","node_taylor","node_bigo","node_floating_point"],"importance":4},{"id":"node_error_abs","title":"Absolute Error","content":"Absolute error quantifies the raw magnitude of the discrepancy between a true value p and its numerical approximation p*, expressed as |p − p*|. It answers the question: by how much, in the same units as the quantity itself, does our answer deviate from the truth? Absolute error is useful when the scale of the quantity is fixed and meaningful — for example, knowing that a computed length is off by 0.002 metres tells you something concrete. However, absolute error alone can be misleading when comparing errors across quantities of very different magnitudes, which is why relative error is often preferred. In iterative methods, a stopping criterion of |p_n − p_{n−1}| < ε uses absolute error to decide when successive approximations are close enough.","connected":["node_error_rel"],"importance":2},{"id":"node_error_rel","title":"Relative Error","content":"Relative error normalises the absolute error against the magnitude of the true value: |p − p*| / |p|. This makes it a dimensionless, scale-independent measure of accuracy — an error of 0.01 means the approximation is off by 1% regardless of whether the true value is 5 or 5,000,000. Relative error is especially important in numerical analysis because computers work with finite-precision floating-point numbers, and rounding errors naturally scale with the size of the numbers involved. For root-finding stopping criteria, |p_n − p_{n−1}| / |p_n| < ε is often safer than an absolute tolerance. Catastrophic cancellation — subtracting two nearly equal floating-point numbers — can cause the relative error to blow up even when absolute error seems small.","connected":["node_error_abs"],"importance":3},{"id":"node_ivt","title":"Intermediate Value Theorem (IVT)","content":"The Intermediate Value Theorem states that if f is a real-valued function continuous on a closed interval [a, b], then for every value k strictly between f(a) and f(b) there exists at least one c in the open interval (a, b) such that f(c) = k. In numerical analysis this theorem is the theoretical cornerstone of bracketing root-finding methods. Specifically, if f(a) and f(b) have opposite signs — i.e. f(a)·f(b) < 0 — then the IVT guarantees that at least one root exists within [a, b]. The Bisection Method exploits this guarantee: it repeatedly halves the interval, always keeping the sub-interval where the sign change is observed, and is therefore guaranteed to converge to a root as long as f is continuous. Without the IVT, we could not claim the algorithm terminates correctly.","connected":["unit_roots","node_bisection"],"importance":3},{"id":"node_mvt","title":"Mean Value Theorem (MVT)","content":"The Mean Value Theorem states that if f is continuous on [a, b] and differentiable on (a, b), then there exists at least one point c ∈ (a, b) such that f′(c) = (f(b) − f(a)) / (b − a). Geometrically, the slope of the secant line connecting (a, f(a)) to (b, f(b)) equals the instantaneous slope of the tangent at some interior point c. In numerical analysis, the MVT is used extensively to bound truncation errors in finite difference formulas and to analyse the convergence of iterative root-finding methods. It also underpins the derivation of Newton's Method, where the linear approximation to f near a root is justified by differentiability. The generalised MVT is used in Taylor's Theorem to write the Lagrange remainder term.","connected":["node_taylor"],"importance":3},{"id":"node_taylor","title":"Taylor's Theorem","content":"Taylor's Theorem provides a way to approximate any sufficiently smooth function f near a point x₀ as a polynomial plus a remainder term that quantifies the approximation error: f(x) = f(x₀) + f′(x₀)(x−x₀) + f″(x₀)(x−x₀)²/2! + … + f⁽ⁿ⁾(x₀)(x−x₀)ⁿ/n! + Rₙ(x). The Lagrange form of the remainder is Rₙ(x) = f⁽ⁿ⁺¹⁾(ξ)(x−x₀)ⁿ⁺¹/(n+1)! for some ξ between x and x₀. In numerical methods, Taylor's Theorem is the single most important analytical tool: it is used to derive finite difference formulas for derivatives, to analyse the local truncation error of ODE solvers like Euler's Method, to derive Newton's Method from a first-order linear approximation, and to show that higher-order methods achieve faster convergence rates. The Big-O notation for error terms (O(hⁿ)) comes directly from Taylor remainder analysis.","connected":["node_bigo","unit_interpolation","unit_integration"],"importance":4},{"id":"node_bigo","title":"Big-O Notation","content":"Big-O notation, O(g(h)), describes how the error or computational cost of a numerical method scales as a key parameter — usually the step size h or the number of iterations n — approaches a limit (typically 0 or ∞). If the error E(h) = O(hⁿ), it means |E(h)| ≤ C·|h|ⁿ for some constant C and sufficiently small h. In practice, a method with error O(h²) is called 'second-order': halving h reduces the error by a factor of 4. A method with O(h⁴) error is fourth-order: halving h gives 16× improvement. This gives engineers a practical way to trade off accuracy against computational cost (smaller h means more steps). Convergence order is determined by Taylor expanding the method and identifying the leading remainder term. For example, the Forward Euler method has local truncation error O(h²) and global error O(h), making it first-order accurate.","connected":["node_taylor"],"importance":3},{"id":"node_floating_point","title":"Floating Point Math","content":"Computers represent real numbers in binary floating-point format: a sign bit, a fixed-width mantissa (significand), and an exponent. The IEEE 754 double-precision standard uses 64 bits — 1 sign, 11 exponent, 52 mantissa — giving about 15–17 significant decimal digits of precision. Because only finitely many numbers can be represented, most real numbers must be rounded to the nearest representable value, introducing rounding error. There are two main rounding strategies: rounding (to the nearest float) and chopping (truncating extra digits). Errors accumulate across arithmetic operations: subtraction of nearly equal numbers (catastrophic cancellation) can cause catastrophic loss of significant digits, while repeated multiplication amplifies small errors. Machine epsilon ε_mach ≈ 2.22×10⁻¹⁶ for double precision is the upper bound on relative rounding error for a single operation, and understanding it is essential for writing numerically stable algorithms.","connected":["unit_background"],"importance":3},{"id":"unit_roots","title":"Root-Finding Methods","content":"Root-finding methods are iterative numerical algorithms that find values x where f(x) = 0. They are needed whenever equations cannot be solved algebraically — which is the case for most transcendental, nonlinear, and high-degree polynomial equations in engineering. The unit covers both bracketing methods (Bisection, False Position) which are guaranteed to converge because they always maintain an interval containing the root, and open methods (Secant, Newton's Method) which converge faster but require a good initial guess and may diverge. Key concepts include convergence order, stopping criteria (absolute/relative error tolerances), and how derivative information speeds up convergence.","connected":["node_bisection","node_false_position","node_secant","node_newton_root"],"importance":4},{"id":"node_bisection","title":"Bisection Method","content":"The Bisection Method is a robust, guaranteed-convergence root-finding algorithm based on the Intermediate Value Theorem. Given a continuous f and an initial bracket [a, b] with f(a)·f(b) < 0, it repeatedly halves the interval: compute the midpoint m = (a+b)/2, evaluate f(m), then replace a with m if f(a)·f(m) > 0, otherwise replace b with m. This ensures the bracket always contains the root and shrinks by exactly 50% each iteration. After n iterations the bracket has width (b−a)/2ⁿ, so the absolute error is bounded by (b−a)/2ⁿ⁺¹. The number of steps needed to achieve tolerance ε is ⌈log₂((b−a)/ε)⌉. Its main drawback is slow, linear convergence: each iteration buys exactly one bit of precision. It does not use derivative information and cannot find complex roots, but its reliability makes it a useful fallback and a benchmark for comparison.","connected":["node_ivt","node_false_position"],"importance":3},{"id":"node_false_position","title":"Method of False Position","content":"The Method of False Position (Regula Falsi) is a bracketing root-finding method that, like Bisection, maintains an interval [a, b] with f(a)·f(b) < 0. Instead of choosing the midpoint, it uses the x-intercept of the secant line through (a, f(a)) and (b, f(b)): x_new = b − f(b)·(b−a)/(f(b)−f(a)). This is a better linear estimate of the root than the midpoint when f is not symmetric. False Position retains the guaranteed convergence of bracketing methods but in practice often converges faster than Bisection when f is smooth and nearly linear near the root. However, it can be pathologically slow — sometimes slower than Bisection — if one endpoint never updates (the stagnation problem), because one side of the bracket barely changes. The Illinois modification addresses this by halving the function value at the stagnant endpoint.","connected":["node_bisection","node_secant"],"importance":2},{"id":"node_secant","title":"Secant Method","content":"The Secant Method is an open (non-bracketing) root-finding algorithm that approximates Newton's Method without requiring an explicit derivative. It uses the finite-difference approximation f′(xₙ) ≈ (f(xₙ)−f(xₙ₋₁))/(xₙ−xₙ₋₁), giving the iteration: x_{n+1} = xₙ − f(xₙ)·(xₙ−xₙ₋₁)/(f(xₙ)−f(xₙ₋₁)). It requires two starting points x₀ and x₁ (not necessarily a bracket) and does not need f′. Its convergence order is the golden ratio ≈ 1.618 — super-linear but sub-quadratic. Compared to Newton's Method (order 2), each Secant step needs only one new function evaluation, making it more efficient per-derivative-evaluation. It can fail to converge if f(xₙ) ≈ f(xₙ₋₁) (division near zero) or if the iterates diverge away from the root.","connected":["node_false_position","node_newton_root"],"importance":3},{"id":"node_newton_root","title":"Newton's Method (Roots)","content":"Newton's Method (Newton–Raphson) is the most widely used root-finding algorithm in practice due to its quadratic convergence near a simple root. Starting from an initial guess x₀, it linearises f at the current point using its tangent line and sets the next iterate to the tangent's x-intercept: x_{n+1} = xₙ − f(xₙ)/f′(xₙ). If x₀ is sufficiently close to a simple root r, the error eₙ = xₙ − r satisfies |e_{n+1}| ≈ C·eₙ², meaning the number of correct decimal digits roughly doubles each iteration. In practice this means 3–4 iterations often suffice after the first good estimate. Its weakness: it requires computing f′ analytically, it may diverge if the initial guess is far from the root or if f′(xₙ) ≈ 0, and it only has linear convergence at roots of multiplicity > 1.","connected":["node_secant","node_newton_opt"],"importance":4},{"id":"unit_optimization","title":"Optimization","content":"The Optimization unit covers numerical methods for finding local minima or maxima of a function f(x) — equivalently, finding roots of f′(x) = 0. Since most engineering objectives (cost, stress, energy) are too complex for closed-form minimization, iterative numerical methods are essential. The unit covers Newton's Method applied to f′, gradient descent, and the relationship between root-finding and optimization. Understanding convergence rates and the role of the second derivative (curvature) in selecting step sizes is central.","connected":["node_newton_opt","node_gradient_descent"],"importance":4},{"id":"node_newton_opt","title":"Newton's Method for Optimization","content":"Newton's Method for optimization applies the root-finding Newton iteration to f′(x) rather than f(x) itself, seeking critical points where f′(x) = 0. The iteration is: x_{n+1} = xₙ − f′(xₙ)/f″(xₙ). This is equivalent to fitting a local quadratic (second-order Taylor polynomial) to f at xₙ and jumping to that quadratic's minimum. When the Hessian f″ is positive definite near the true minimum and x₀ is close enough, convergence is quadratic — the same as Newton's root-finding method. In multiple dimensions, f″ becomes the Hessian matrix H and f′ becomes the gradient ∇f, giving the update x_{n+1} = xₙ − H⁻¹∇f. The major cost is forming and inverting H (O(n³) for an n-variable problem), which motivates quasi-Newton methods that approximate H⁻¹ cheaply.","connected":["node_newton_root","node_gradient_descent"],"importance":3},{"id":"node_gradient_descent","title":"Gradient Descent","content":"Gradient descent is a first-order iterative optimisation algorithm that moves from the current point in the direction of steepest decrease — i.e., opposite to the gradient ∇f. The update rule is x_{n+1} = xₙ − α·∇f(xₙ), where α > 0 is the learning rate (step size). If α is too large the method overshoots and may diverge; too small and convergence is painfully slow. In one dimension this reduces to x_{n+1} = xₙ − α·f′(xₙ). Gradient descent has only linear convergence in general, compared to Newton's quadratic convergence, because it uses no curvature information. However, computing the gradient is O(n) vs. O(n²)–O(n³) for Newton's Hessian, making gradient descent or its stochastic variants the dominant algorithm in large-scale machine learning where n (number of parameters) can be billions.","connected":["unit_optimization"],"importance":3},{"id":"unit_interpolation","title":"Curve-Fitting & Interpolation","content":"The Interpolation unit addresses the problem of constructing a smooth function that passes exactly through a given set of discrete data points (x₀,y₀), …, (xₙ,yₙ). This is useful for estimating values between measurements, reconstructing functions from sampled data, and building efficient approximations of expensive-to-evaluate functions. The unit focuses on polynomial interpolation via Newton's divided difference form, which is computationally convenient and numerically stable. Key topics include uniqueness of the interpolating polynomial, divided difference tables, and error analysis via the Lagrange remainder form.","connected":["node_newton_poly","node_divided_diff"],"importance":4},{"id":"node_newton_poly","title":"Newton Polynomial","content":"The Newton interpolating polynomial is a numerically convenient form of the unique degree-n polynomial passing through n+1 distinct data points. It is expressed in the Newton forward-difference basis: P(x) = f[x₀] + f[x₀,x₁](x−x₀) + f[x₀,x₁,x₂](x−x₀)(x−x₁) + … where the square-bracket terms are divided differences. This factored form has two key advantages over the Lagrange form: (1) Adding a new data point (xₙ₊₁, yₙ₊₁) requires only one new divided difference computation — all previous coefficients remain unchanged. (2) Evaluation via Horner's nested multiplication is efficient and numerically stable. The interpolation error at any point x is bounded by |f[x₀,…,xₙ,x]|·|(x−x₀)…(x−xₙ)| — identical to the Lagrange error bound but written using divided differences.","connected":["node_divided_diff"],"importance":3},{"id":"node_divided_diff","title":"Divided Differences","content":"Divided differences are a recursive scheme for computing the coefficients of the Newton interpolating polynomial. The zeroth-order divided difference f[xᵢ] = f(xᵢ). The first-order f[xᵢ,xᵢ₊₁] = (f[xᵢ₊₁]−f[xᵢ])/(xᵢ₊₁−xᵢ). In general, f[xᵢ,…,xᵢ₊ₖ] = (f[xᵢ₊₁,…,xᵢ₊ₖ]−f[xᵢ,…,xᵢ₊ₖ₋₁])/(xᵢ₊ₖ−xᵢ). These are arranged in a triangular table: the diagonal gives the Newton polynomial coefficients. A key theoretical identity connects divided differences to derivatives: when all nodes coincide (confluent case), f[x₀,…,xₙ] → f⁽ⁿ⁾(x₀)/n!, which links the polynomial interpolation framework to Taylor series. Divided differences are symmetric: the value does not change if the nodes are permuted.","connected":["node_newton_poly"],"importance":3},{"id":"unit_integration","title":"Numerical Integration","content":"Numerical integration (quadrature) approximates the definite integral ∫ₐᵇ f(x)dx when f has no closed-form antiderivative, or when f is only known at discrete sample points. The fundamental strategy is to replace f with a simpler interpolating polynomial and integrate that polynomial exactly. Increasing the polynomial degree or using more subintervals increases accuracy. The unit covers the Newton–Cotes family (Riemann, Trapezoid, Simpson), their error formulas, and the composite versions that apply the rule to many small subintervals for much better accuracy.","connected":["node_trapezoid_rule","node_simpson_rule","node_riemann_sum"],"importance":4},{"id":"node_riemann_sum","title":"Riemann Sums","content":"Riemann sums are the simplest numerical integration schemes: the integral ∫ₐᵇ f(x)dx is approximated by summing the areas of rectangles of width h = (b−a)/n. The left Riemann sum uses f(xᵢ) as the height; the right sum uses f(xᵢ₊₁); the midpoint rule uses f at the midpoint of each subinterval. The midpoint rule has error O(h²) per subinterval (global error O(h)), making it first-order accurate and generally more accurate than the left/right rules. While conceptually simple, Riemann sums converge slowly — halving h only halves the error. They serve mainly as a conceptual foundation and are rarely used in practice when more accurate methods like Simpson's rule (O(h⁴)) are available at little additional cost.","connected":["node_trapezoid_rule"],"importance":2},{"id":"node_trapezoid_rule","title":"Trapezoid Rule","content":"The Trapezoid Rule approximates ∫ₐᵇ f(x)dx by connecting consecutive sample points with straight lines (degree-1 polynomial interpolation) and summing the areas of the resulting trapezoids. For a single interval: T = (h/2)[f(a)+f(b)], with error −h³f″(ξ)/12 for some ξ ∈ (a,b). The composite Trapezoid Rule over n subintervals of width h = (b−a)/n has global error O(h²) — halving h reduces error by a factor of 4. An important property (the Euler–Maclaurin formula) shows the error has an asymptotic expansion in even powers of h, which enables Richardson Extrapolation to cancel error terms and dramatically boost accuracy. The Trapezoid Rule is exact for linear functions and for any function periodic over [a,b] (making it super-accurate for smooth periodic integrands).","connected":["node_riemann_sum","node_simpson_rule"],"importance":3},{"id":"node_simpson_rule","title":"Simpson's Rule","content":"Simpson's Rule fits a degree-2 polynomial (parabola) through three consecutive points and integrates it exactly, giving: ∫ₐᵇ f(x)dx ≈ (h/3)[f(a) + 4f((a+b)/2) + f(b)] where h = (b−a)/2. The single-interval error is −h⁵f⁽⁴⁾(ξ)/90 — fourth-order in h. Because the third-order term vanishes (a fortuitous cancellation), Simpson's Rule achieves O(h⁴) accuracy despite only using a quadratic interpolant, making it exact for polynomials of degree ≤ 3. The composite version divides [a,b] into an even number n of subintervals: T = (h/3)[f(x₀) + 4f(x₁) + 2f(x₂) + 4f(x₃) + … + 4f(xₙ₋₁) + f(xₙ)]. With global error O(h⁴), it is vastly more efficient than the Trapezoid Rule for smooth functions and is the standard choice in engineering quadrature.","connected":["node_trapezoid_rule"],"importance":3},{"id":"unit_ivp","title":"Initial Value Problems (IVPs)","content":"An Initial Value Problem is a first-order ODE y′ = f(t, y) paired with an initial condition y(t₀) = y₀. IVPs arise everywhere in engineering — population models, circuit analysis, spring-mass systems, trajectory simulation. Because most ODEs lack closed-form solutions, numerical methods step forward in time from the known initial condition, approximating the solution at a discrete sequence of time points. The unit covers Euler's Method (simplest, first-order), Runge–Kutta methods (higher-order, the workhorse of scientific computing), and the Butcher Tableau framework for systematically classifying and deriving RK methods.","connected":["node_euler_method","node_runge_kutta"],"importance":4},{"id":"node_euler_method","title":"Euler's Method","content":"Euler's Method is the simplest numerical ODE solver. Starting from y(t₀) = y₀, it advances the solution one step at a time using the tangent-line approximation: y_{i+1} = yᵢ + h·f(tᵢ, yᵢ), where h is the step size. The local truncation error (error introduced in one step) is O(h²) from the Taylor expansion; the global error accumulated over all steps is O(h) — making it first-order accurate. Halving h halves the global error but doubles the number of steps and function evaluations. Euler's Method can become unstable for stiff ODEs unless h is very small. Despite its simplicity and low accuracy, it is invaluable pedagogically: all higher-order methods such as Runge–Kutta can be understood as corrections to Euler that cancel higher-order Taylor terms by evaluating f at additional points within each step.","connected":["node_runge_kutta"],"importance":3},{"id":"node_runge_kutta","title":"Runge-Kutta Methods","content":"Runge–Kutta (RK) methods achieve higher-order accuracy than Euler's Method by evaluating the right-hand side function f at multiple points within each time step and taking a weighted average of the resulting slopes. The classical RK4 method uses four slope evaluations: k₁ = hf(tᵢ, yᵢ), k₂ = hf(tᵢ+h/2, yᵢ+k₁/2), k₃ = hf(tᵢ+h/2, yᵢ+k₂/2), k₄ = hf(tᵢ+h, yᵢ+k₃), and updates y_{i+1} = yᵢ + (k₁+2k₂+2k₃+k₄)/6. The local truncation error is O(h⁵) and the global error is O(h⁴). RK4 gives 16× error reduction for each halving of h. The Midpoint Method (RK2) gives O(h²) global accuracy with just two function evaluations per step. Higher-order methods (RK5, Dormand–Prince) are used in adaptive step-size solvers like MATLAB's ode45, which automatically adjust h to maintain a user-specified tolerance.","connected":["node_euler_method","node_butcher_tableau"],"importance":4},{"id":"node_butcher_tableau","title":"Butcher Tableaus","content":"A Butcher Tableau is a compact notation for encoding the coefficients of any explicit or implicit Runge–Kutta method. It consists of three parts arranged in a table: the vector c of time offsets (fractions of h at which f is evaluated), the matrix A of coupling coefficients (how earlier stage slopes feed into later ones), and the vector b of weights for the final weighted average. For a single-step explicit s-stage method, the tableau has s rows. Reading the tableau directly tells you everything: how many function evaluations per step, the stage structure, and whether the method is explicit (A is strictly lower triangular) or implicit. The consistency condition requires ∑bᵢ = 1. Butcher Tableaux allow systematic derivation of new RK methods by solving the 'order conditions' — algebraic equations on A, b, c that ensure the method's Taylor expansion matches that of the true solution to the desired order.","connected":["node_runge_kutta"],"importance":2},{"id":"unit_differentiation","title":"Finite Difference Differentiation","content":"Finite difference methods approximate derivatives numerically by combining function values at discrete points separated by a small step size h. They are derived by writing Taylor series expansions around a point and algebraically eliminating higher-order terms to isolate the desired derivative. The three primary formulas are: Forward Difference f′(x) ≈ (f(x+h)−f(x))/h with error O(h); Backward Difference f′(x) ≈ (f(x)−f(x−h))/h with error O(h); Centred Difference f′(x) ≈ (f(x+h)−f(x−h))/(2h) with error O(h²). The centred formula is much preferred in practice because its O(h²) error means halving h gives 4× improvement vs. 2× for forward/backward. Second derivatives use f″(x) ≈ (f(x+h)−2f(x)+f(x−h))/h² + O(h²). A fundamental tension exists: making h smaller reduces truncation error but increases round-off error (from floating-point subtraction of nearly equal numbers), so there is an optimal h ≈ √ε_mach for first derivatives.","connected":["unit_background"],"importance":4}]}

export default function TextInput({ onSubmit }) {
  const [text, setText] = useState('')
  const [pdfFile, setPdfFile] = useState(null)
  const [mode, setMode] = useState('text') // 'text' | 'pdf'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef(null)
  const wrapperRef   = useRef(null)

  // GSAP entrance — stagger children up from below
  useEffect(() => {
    if (!wrapperRef.current) return
    const els = wrapperRef.current.children
    gsap.fromTo(els,
      { y: 24, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, stagger: 0.07, ease: 'power2.out', clearProps: 'y,opacity' }
    )
  }, [])

  // Magnetic effect on buttons
  useMagneticGroup(wrapperRef, 'button', 0.36)

  const handlePdfSelect = (file) => {
    if (!file) return
    if (file.type !== 'application/pdf') {
      setError('Only PDF files are accepted.')
      return
    }
    setError('')
    setPdfFile(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    handlePdfSelect(file)
  }

  const handleSubmit = async () => {
    if (mode === 'text' && !text.trim()) return
    if (mode === 'pdf' && !pdfFile) return
    setLoading(true)
    setError('')
    try {
      // ── DEV PLACEHOLDER: remove this block when deploying (see top of file) ──
      if (USE_PLACEHOLDER) {
        await new Promise((r) => setTimeout(r, 600)) // fake latency
        onSubmit(PLACEHOLDER_GRAPH)
        return
      }
      // ── END PLACEHOLDER ───────────────────────────────────────────────────────
      let res
      if (mode === 'pdf') {
        const formData = new FormData()
        formData.append('pdf', pdfFile)
        res = await fetch(`${BACKEND_URL}/generate-pdf`, {
          method: 'POST',
          body: formData,
        })
      } else {
        res = await fetch(`${BACKEND_URL}/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: text }),
        })
      }
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || 'Backend error')
      onSubmit(json.data.graph)
    } catch (err) {
      setError(err.message || 'Failed to reach backend')
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = mode === 'text' ? text.trim().length > 0 : pdfFile !== null

  return (
    <div className="input-wrapper" ref={wrapperRef}>
      <h1 className="input-title">MindMesh</h1>
      <p className="input-sub">Paste your notes or upload a PDF to generate a knowledge graph</p>

      <div className="input-mode-toggle">
        <button
          className={`mode-btn ${mode === 'text' ? 'mode-btn--active' : ''}`}
          onClick={() => { setMode('text'); setError('') }}
        >
          Text
        </button>
        <button
          className={`mode-btn ${mode === 'pdf' ? 'mode-btn--active' : ''}`}
          onClick={() => { setMode('pdf'); setError('') }}
        >
          PDF
        </button>
      </div>

      {mode === 'text' ? (
        <textarea
          className="input-box"
          placeholder="Paste your text here..."
          value={text}
          onChange={e => setText(e.target.value)}
          rows={8}
        />
      ) : (
        <div
          className={`pdf-drop-zone ${dragging ? 'pdf-drop-zone--dragging' : ''} ${pdfFile ? 'pdf-drop-zone--filled' : ''}`}
          onClick={() => fileInputRef.current.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            style={{ display: 'none' }}
            onChange={e => handlePdfSelect(e.target.files[0])}
          />
          {pdfFile ? (
            <>
              <span className="pdf-icon">📄</span>
              <span className="pdf-filename">{pdfFile.name}</span>
              <button
                className="pdf-clear-btn"
                onClick={(e) => { e.stopPropagation(); setPdfFile(null) }}
              >
                Remove
              </button>
            </>
          ) : (
            <>
              <span className="pdf-icon">⬆</span>
              <span className="pdf-drop-label">Click or drag & drop a PDF here</span>
              <span className="pdf-drop-hint">PDF files only</span>
            </>
          )}
        </div>
      )}

      {error && <p className="input-error">{error}</p>}

      <button
        className={`input-btn${(!canSubmit && !loading) ? ' input-btn--inactive' : ''}`}
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? 'Generating…' : 'Generate Graph'}
      </button>
    </div>
  )
}