# evaluator.py
import numpy as np
from dataclasses import dataclass

# =========================
# Utility functions
# =========================

def sum_coeff_list(lists):
    return list(np.sum(lists, axis=0))


def check_non_negative(lst):
    if any(x <= 0 for x in lst):
        return False
    return True


def split_theta(theta):
    split_index = int(len(theta) / 2)
    alpha = theta[:split_index]
    beta  = theta[split_index:]
    return alpha, beta


# =========================
# Divisors & intersections
# =========================

def gen_Pic_divisor(coeffs, Pic_generators):
    tmp = []
    for i in range(len(coeffs)):
        tmp.append([coeffs[i] * g for g in Pic_generators[i]])
    return sum_coeff_list(tmp)


def generate_invariant_divisor_i(number_of_rays, index):
    invariant_div = [0 for _ in range(number_of_rays)]
    invariant_div[index] = 1
    return invariant_div


def convert_to_pic_description(div, surface):
    pic_gen = surface.picard_generators
    converted_div = [0 for _ in range(len(pic_gen[0]))]
    for i, coeff in enumerate(div):
        for j, val in enumerate(pic_gen[i]):
            converted_div[j] += coeff * val
    return converted_div


# =========================
# Intersection number calculations
# =========================

def intersection_calculator(div1, div2, surface):
    im = surface.intersection_matrix
    if len(div1) == len(surface.picard_generators):
        conv_div1 = convert_to_pic_description(div1, surface)
    else:
        conv_div1 = np.array(div1)
    if len(div2) == len(surface.picard_generators):
        conv_div2 = convert_to_pic_description(div2, surface)
    else:
        conv_div2 = np.array(div2)

    return np.dot(np.dot(conv_div1, im), np.transpose(conv_div2))


def is_kaehler(divisor, surface):
    intersection_numbers = []
    for i in range(len(surface.rays)):
        invariant_divisor = generate_invariant_divisor_i(len(surface.rays), i)
        intersection_number = intersection_calculator(
            div1=divisor, div2=invariant_divisor, surface=surface
        )
        intersection_numbers.append(intersection_number)
    return check_non_negative(intersection_numbers), intersection_numbers


def compute_anti_canonical(surface):
    pic_gen = surface.picard_generators
    return [1 for _ in range(len(pic_gen) + 2)]


def compute_alpha_squared(alpha, surface):
    return intersection_calculator(div1=alpha, div2=alpha, surface=surface)


def compute_alpha_beta(alpha, beta, surface):
    return intersection_calculator(div1=alpha, div2=beta, surface=surface)

# =========================
# Kaehler inequalities check
# =========================

def check_kaehler_inequalities(alpha, beta, surface):
    """
    Returns (alpha_satisfied, beta_satisfied) as two separate bool lists,
    one per ray -- so we can report them independently.
    """
    _, alpha_ints = is_kaehler(alpha, surface)
    _, beta_ints  = is_kaehler(beta,  surface)
    alpha_ok = [a > 0 for a in alpha_ints]
    beta_ok  = [b > 0 for b in beta_ints]
    return alpha_ok, beta_ok

# =========================
# Equation functions
# =========================
# Every function returns (value, valid, invariant_divisor_index)
# invariant_divisor_index is None when valid=False.

def compute_full_factor_Jeq(alpha, beta, surface):
    """
    J(alpha,beta): minimize over invariant divisors.
    Returns (value, valid, argmin_divisor_index).
    """
    is_alpha_kaehler, alpha_inv = is_kaehler(alpha, surface)
    is_beta_kaehler,  beta_inv  = is_kaehler(beta,  surface)

    if not (is_alpha_kaehler and is_beta_kaehler):
        return np.nan, False, None

    alpha_sq     = compute_alpha_squared(alpha, surface)
    alpha_b      = compute_alpha_beta(alpha, beta, surface)
    first_factor = 2 * (alpha_b / alpha_sq)

    result            = np.inf
    invariant_divisor = None

    for i in range(len(alpha_inv)):
        second_factor = beta_inv[i] / alpha_inv[i]
        full_factor   = first_factor - second_factor
        if full_factor < result:
            result            = full_factor
            invariant_divisor = i

    return result, True, invariant_divisor


def compute_full_factor_cscK(alpha, beta, surface):
    """
    I(alpha): beta fixed to anti-canonical, maximize over invariant divisors.
    Returns (value, valid, argmax_divisor_index).
    """
    antican = compute_anti_canonical(surface)

    is_alpha_kaehler, alpha_inv   = is_kaehler(alpha,   surface)
    _,                antican_inv = is_kaehler(antican,  surface)

    if not is_alpha_kaehler:
        return np.nan, False, None

    alpha_sq     = compute_alpha_squared(alpha, surface)
    alpha_b      = compute_alpha_beta(alpha, antican, surface)
    first_factor = 2 * (alpha_b / alpha_sq)

    result            = -np.inf
    invariant_divisor = None

    for i in range(len(alpha_inv)):
        second_factor = antican_inv[i] / alpha_inv[i]
        full_factor   = first_factor - second_factor
        if full_factor > result:
            result            = full_factor
            invariant_divisor = i

    return -result, True, invariant_divisor


EQUATIONS = {
    "J(alpha,beta)": compute_full_factor_Jeq,
    "I(alpha)":      compute_full_factor_cscK,
}


def evaluate_point(name, theta, surface):
    fn = EQUATIONS.get(name)
    if fn is None:
        raise ValueError(f"Unknown equation: {name!r}. Available: {list(EQUATIONS)}")
    theta    = np.asarray(theta)
    divisors = split_theta(theta)
    alpha    = divisors[0][0]
    beta     = divisors[1][0]
    return fn(alpha, beta, surface)


# =========================
# Vectorised grid computation
# =========================

@dataclass
class AxisSpec:
    vector: str  # "alpha" or "beta"
    k: int       # coefficient index within that vector


def compute_grid(
    equation_name: str,
    base_alpha: np.ndarray,
    base_beta: np.ndarray,
    x_axis: AxisSpec,
    y_axis: AxisSpec,
    surface,
    axis_values: np.ndarray,
) -> tuple:
    """
    Vectorised (res, res) heatmap grid replacing the O(n^2) loop in evaluate_slice.
    Returns (X, Y, J, mask, div_grid) matching the evaluate_slice contract.
    """
    n_vals = len(axis_values)

    X, Y = np.meshgrid(axis_values, axis_values, indexing="ij")  # (res, res)

    # Build per-cell alpha/beta grids: (res, res, n_pic)
    alpha_grid = np.tile(base_alpha, (n_vals, n_vals, 1)).copy()
    beta_grid  = np.tile(base_beta,  (n_vals, n_vals, 1)).copy()

    if x_axis.vector == "alpha":
        alpha_grid[:, :, x_axis.k] = X
    else:
        beta_grid[:, :, x_axis.k] = X

    if y_axis.vector == "alpha":
        alpha_grid[:, :, y_axis.k] = Y
    else:
        beta_grid[:, :, y_axis.k] = Y

    # Intersection matrices
    P  = np.array(surface.picard_generators, dtype=float)  # (n_pic, n_rays)
    IM = np.array(surface.intersection_matrix, dtype=float)  # (n_rays, n_rays)
    B  = P @ IM        # (n_pic, n_rays): maps Pic coeffs -> invariant divisor intersections
    A  = P @ IM @ P.T  # (n_pic, n_pic): Picard intersection form

    with np.errstate(divide="ignore", invalid="ignore"):
        # Invariant-divisor intersection numbers: (res, res, n_rays)
        alpha_inv = alpha_grid @ B

        # Kaehler: all intersection numbers strictly positive
        alpha_kaehler = (alpha_inv > 0).all(axis=-1)  # (res, res)

        # Self-intersection: (res, res)
        alpha_sq = np.einsum("ijk,kl,ijl->ij", alpha_grid, A, alpha_grid)

        if equation_name == "J(alpha,beta)":
            beta_inv     = beta_grid @ B
            beta_kaehler = (beta_inv > 0).all(axis=-1)
            mask         = alpha_kaehler & beta_kaehler

            alpha_beta   = np.einsum("ijk,kl,ijl->ij", alpha_grid, A, beta_grid)
            first_factor = 2.0 * alpha_beta / alpha_sq  # (res, res)

            # Full factor per invariant divisor: (res, res, n_rays)
            factors = first_factor[..., None] - beta_inv / alpha_inv

            # Pin invalid cells to inf so argmin stays numerically valid
            pinned   = np.where(mask[..., None], factors, np.inf)
            div_grid = pinned.argmin(axis=-1).astype(int)
            div_grid[~mask] = -1

            J = np.where(mask, factors.min(axis=-1), np.nan)

        elif equation_name == "I(alpha)":
            mask = alpha_kaehler

            # Anti-canonical = all-ones in ray space; intersections = IM column sums
            antican_inv   = IM.sum(axis=0)         # (n_rays,)
            alpha_antican = alpha_inv.sum(axis=-1)  # (res, res)
            first_factor  = 2.0 * alpha_antican / alpha_sq

            factors = first_factor[..., None] - antican_inv / alpha_inv

            # Pin invalid cells to -inf so argmax stays numerically valid
            pinned   = np.where(mask[..., None], factors, -np.inf)
            div_grid = pinned.argmax(axis=-1).astype(int)
            div_grid[~mask] = -1

            # Negate max to match compute_full_factor_cscK sign convention
            J = np.where(mask, -factors.max(axis=-1), np.nan)

        else:
            raise ValueError(
                f"Unknown equation: {equation_name!r}. Available: {list(EQUATIONS)}"
            )

    return X, Y, J, mask, div_grid
