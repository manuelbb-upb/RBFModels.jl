
# This file is included from within RBFModels.jl #src 

# ## Constructors
# ###  Polynomial Basis 

# Any constructor of an `RBFModel` must solve for the coefficients.
# To build the equation system, we need a basis ``\{p_j\}_{1 \le j \le Q}`` of ``Π_d(ℝ^n)``.

# The canonical basis is ``x_1^{α_1} x_2^{α_2} … x_n^{α_n}`` with 
# ``α_i ≥ 0`` and ``Σ_i α_i ≤ d``.
# For ``\bar{d} \le d`` we can recursively get the non-negative integer solutions for 
# ``Σ_i α_i = \bar{d}`` with the following function:

@doc """
    non_negative_solutions( d :: Int, n :: Int)

Return a matrix with columns that correspond to solution vectors 
``[x_1, …, x_n]`` to the equation ``x_1 + … + x_n = d``,
where the variables are non-negative integers.
"""
function non_negative_solutions( d :: Int, n :: Int )
    if n == 1
        return fill(d,1,1)
    else
        num_sols = binomial( d + n - 1, n - 1)
        sol_matrix = Matrix{Int}(undef, n, num_sols)
        j = 1
        for i = 0 : d
            ## find all solutions of length `n-1` that sum to `i` 
            ## if add `d-i` to each column, then each column 
            ## has `n` elements and sums to `d`
            padded_shorter_solutions = vcat( d-i, non_negative_solutions(i, n-1) )
            num_shorter_sols = size( padded_shorter_solutions, 2 )
            sol_matrix[:, j : j + num_shorter_sols - 1] .= padded_shorter_solutions
            j += num_shorter_sols
        end
        return sol_matrix
    end
end

function non_negative_solutions_ineq( d :: Int, n :: Int )
    return hcat( (non_negative_solutions( d̄, n ) for d̄=0:d )... )
end

# !!! note 
#     I did an unnecessary rewrite of `non_negative_solutions` to be 
#     Zygote-compatible. Therefore the buffers...
#    `Combinatorics` has `multiexponents` which should do the same...

# We **don't** use `DynamicPolynomials.jl` to generate the Polyomials **anymore**.
# Zygote did overflow when there were calculations with those polynomials.
# Not a problem for calculating the basis (because of `@nograd`),
# but when constructing the outputs from them.
# Instead we directly construct `StaticPolynomial`s.

##@memoize ThreadSafeDict 
@doc """
    canonical_basis( n:: Int, d :: Int ) :: Union{PolynomialSystem, EmptyPolySystem}

Return the canonical basis of the space of `n`-variate 
polynomials of degree at most `d`.
"""
Zyg.@nograd function canonical_basis( n :: Int, d :: Int )
    if d < 0
        return EmptyPolySystem{n}()
    else
        exponent_matrix = non_negative_solutions_ineq( d, n )
        return PolynomialSystem( ( Polynomial( [1,], e[:,:] ) for e ∈ eachcol(exponent_matrix) )... )
    end
end

# ### Solving the Equation System 
# For now, we use the `\` operator to solve `A * coeff = RHS`.
# Furthermore, we allow for different interpolation `sites` and 
# RBF centers by allowing for passing `kernels`.
const VecOfVecs{T} = AbstractVector{<:AbstractVector}

@doc """
    coefficients(sites, values, kernels, rad_funcs, polys )

Return the coefficient matrices `w` and `λ` for an rbf model 
``r(x) = Σ_{i=1}^N wᵢ φ(\\|x - x^i\\|) + Σ_{j=1}^M λᵢ pᵢ(x)``,
where ``N`` is the length of `rad_funcs` (and `centers`) and ``M``
is the length of `polys`.

The arguments are 
* an array of data sites `sites` with vector entries from ``ℝ^n``.
* an array of data values `values` with vector entries from ``ℝ^k``.
* an array of `ShiftedKernel`s.
* a `PolynomialSystem` or `EmptyPolySystem` (in case of deg = -1).
"""
function coefficients( 
        sites :: ST, 
        values :: VT, 
        kernels :: AbstractVector{<:ShiftedKernel},
        polys :: Union{PolynomialSystem,EmptyPolySystem} #Vector{<:DP.Polynomial};
    ) where {ST <: AbstractVector, VT <: AbstractVector }

    n_out = length(values[1])
    S = length(sites)
    
    ## Φ-matrix, S × N, formerly `Φ = hcat( (k.(sites) for k ∈ kernels)... )` 
    ## Zygote-compatible:
    N = length(kernels);
    Φ_buff = Buffer( sites[1], S, N )
    for (i, k) ∈ enumerate(kernels)
        Φ_buff[:, i] = k.(sites)
    end
    Φ = copy(Φ_buff)

    @show typeof(Φ)

    ## P-matrix, S × Q, formerly `transpose(hcat( (polys.(sites))... ) )`
    Q = length(polys)
    P_buff = Buffer( sites[1], S, Q )
    for (i, s) ∈ enumerate(sites)
        P_buff[i, :] = polys(s) 
    end
    P = copy(P_buff)
    @show typeof(P)

    ## system matrix A
    Z = ST <: StaticArray ? @SMatrix(zeros(Int, Q, Q )) : zeros(Int, Q, Q)
    A = vcat( [ Φ  P ], [ P' Z ] );

    ## build rhs
    padding = VT <: StaticArray ? @SMatrix(zeros(Int, Q, n_out)) : zeros(Int, Q, n_out)
    RHS = [
        transpose( hcat( values... ) );
        padding
    ];
    ## solve system
    coeff = A \ RHS 

    ## return w and λ
    return coeff[1 : N, :], coeff[N+1 : end, :]
end

# ### The Actual, Usable Constructor 

# We want the user to be able to pass 1D data as scalars and use the following helpers:
function ensure_vec_of_vecs( before :: AbstractVector{<:AbstractVector} )
   return before 
end

Base.vec( x :: T ) where T<:Real = SVector{1,T}(x)
function ensure_vec_of_vecs( before :: AbstractVector{ <:Real } )
    return( [vec(x) for x ∈ before ] )
end

# Helpers to create kernel functions.    
"Return array of `ShiftedKernel`s based functions in `φ_arr` with centers from `centers`."
function make_kernels( φ_arr :: AbstractVector{<:RadialFunction}, centers :: VecOfVecs )
    @assert length(φ_arr) == length(centers)
    [ ShiftedKernel(φ, c) for (φ,c) ∈ zip( φ_arr, centers) ]
end
"Return array of `ShiftedKernel`s based function `φ` with centers from `centers`."
function make_kernels( φ :: RadialFunction, centers :: VecOfVecs )
    [ ShiftedKernel(φ, c) for c ∈ centers ]
end

# We use these methods to construct the RBFSum of a model.
# Note, the name is `get_RBFSum` to not run into infinite recursion with 
# the default constructor.
function get_RBFSum( kernels :: AbstractVector{<:ShiftedKernel}, weights :: AbstractMatrix{<:Real};
        static_arrays :: Bool = true 
    ) 
    num_outputs, num_centers = size(weights)

    ## Sized Matrix?
    #@assert size(weights) == (num_centers, num_outputs) "Weights must have dimensions $((num_centers, num_outputs)) instead of $(size(weights))."
    make_static = !isa(weights, StaticArray) && num_centers * num_outputs < 100
    wmat = begin 
        if static_arrays && make_static
            SMatrix{num_outputs, num_centers}(weights)
        else
            weights
        end
    end

    RBFSum( kernels, wmat )
end

# We now have all ingredients for the basic outer constructor:

@doc """
    RBFModel( features, labels, φ = Multiquadric(), poly_deg = 1; kwargs ... )

Construct a `RBFModel` from the feature vectors in `features` and 
the corresponding labels in `lables`, where `φ` is a `RadialFunction` or a vector of 
`RadialFunction`s.\n
Scalar data can be used, it is transformed internally. \n
StaticArrays can be used, e.g., `features :: Vector{<:SVector}`. 
Providing `SVector`s only might speed up the construction.\n
If the degree of the polynomial tail, `poly_deg`, is too small it will be set to `cpd_order(φ)-1`.

If the RBF centers do not equal the the `features`, you can use the keyword argument `centers` to
pass a list of centers. If `φ` is a vector, then the length of `centers` and `φ` must be equal and 
`centers[i]` will be used in conjunction with `φ[i]` to build a `ShiftedKernel`. \n
If `features` has 1D data, the output of the model will be a 1D-vector.
If it should be a scalar instead, set the keyword argument `vector_output` to `false`.
"""
function RBFModel( 
        features :: AbstractVector{ <:NumberOrVector },
        labels :: AbstractVector{ <:NumberOrVector },
        φ :: Union{RadialFunction,AbstractVector{<:RadialFunction}} = Multiquadric(),
        poly_deg :: Int = 1;
        centers :: AbstractVector{ <:NumberOrVector } = Vector{Float16}[],
        interpolation_indices :: AbstractVector{ <: Int } = Int[],
        vector_output :: Bool = true,
        static_arrays :: Bool = true
    )

    ## Basic Data integrity checks
    @assert !isempty(features) "Provide at least 1 feature vector."
    @assert !isempty(labels) "Provide at least 1 label vector."
    num_vars = length(features[1])
    num_outputs = length(labels[1])
    @assert all( length(s) == num_vars for s ∈ features ) "All features must have same dimension."
    @assert all( length(v) == num_outputs for v ∈ labels ) "All labels must have same dimension."
    
    if !isempty( centers )
        @assert all( length(s) == num_vars for s ∈ centers ) "All centers must have dimension $(num_vars)."
    else
        centers = features
    end

    sites = ensure_vec_of_vecs(features)
    values = ensure_vec_of_vecs(labels)
    centers = ensure_vec_of_vecs(centers)

    num_centers = length(centers)
    # TODO benchmark whether array format makes some difference?
    # centers <: SVector{<:SVector} or Vector{<:SVector} or Vector{<:Vector} makes a difference
    kernels = make_kernels(φ, centers)  
    
    poly_deg = max( poly_deg, cpd_order(φ) - 1 , -1 )
    poly_basis_sys = canonical_basis( num_vars, poly_deg )

    w, λ = coefficients( sites, values, kernels, poly_basis_sys )

    ## build output polynomials
    poly_sum = PolySum( poly_basis_sys, transpose(λ) )

    ## build RBF system 
    rbf_sys = get_RBFSum(kernels, transpose(w); static_arrays)
  
    ## vector output? (dismiss user choice if labels are vectors)
    vec_output = num_outputs == 1 ? vector_output : true
     
    return RBFModel{vec_output, typeof(rbf_sys), typeof(poly_sum)}(
         rbf_sys, poly_sum, num_vars, num_centers, num_outputs 
    )
end

### Special Constructors

# We offer some specialized models (that simply wrap the main type).
struct RBFInterpolationModel
    model :: RBFModel 
end
(mod :: RBFInterpolationModel)(args...) = mod.model(args...)
@forward RBFInterpolationModel.model grad, jac, jacT, auto_grad, auto_jac

# The constructor is a tiny bit simpler and additional checks take place:
"""
    RBFInterpolationModel(features, labels, φ, poly_deg; kwargs… )

Build a model interpolating the feature-label pairs.
Does not accept `center` keyword argument.
"""
function RBFInterpolationModel( 
        features :: AbstractVector{ <:NumberOrVector },
        labels :: AbstractVector{ <:NumberOrVector },
        φ :: Union{RadialFunction,AbstractVector{<:RadialFunction}} = Multiquadric(),
        poly_deg :: Int = 1;
        vector_output :: Bool = true,
        static_arrays :: Bool = true
    )
    @assert length(features) == length(labels) "Provide as many features as labels!"
    mod = RBFModel(features, labels, φ, poly_deg; vector_output, static_arrays)
    return RBFInterpolationModel( mod )
end


# We want to provide a convenient alternative constructor for interpolation models 
# so that the radial function can be defined by passing a `Symbol` or `String`.

const SymbolToRadialConstructor = NamedTuple((
    :gaussian => Gaussian,
    :multiquadric => Multiquadric,
    :inv_multiquadric => InverseMultiquadric,
    :cubic => Cubic,
    :thin_plate_spline => ThinPlateSpline
))

function RBFInterpolationModel(
        features :: AbstractVector{ <:NumberOrVector },
        labels :: AbstractVector{ <:NumberOrVector },
        φ_symb :: Union{Symbol, String},
        φ_args :: Union{Nothing, Tuple} = nothing,
        poly_deg :: Int = 1; kwargs...
    )
    ## which radial function to use?
    radial_symb = Symbol( lowercase( string( φ_symb ) ) )
    if !(radial_symb ∈ keys(SymbolToRadialConstructor))
        @warn "Radial Funtion $(radial_symb) not known, using Gaussian."
        radial_symb = :gaussian
    end
    
    constructor = SymbolToRadialConstructor[radial_symb]
    if φ_args isa Tuple 
        φ = constructor( φ_args... )
    else
        φ = constructor()
    end

    RBFInterpolationModel( features, labels, φ, poly_deg; kwargs... )
end