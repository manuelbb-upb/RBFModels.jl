var documenterSearchIndex = {"docs":
[{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"EditURL = \"<unknown>/src/RBFModels.jl\"","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"Dependencies of this module:","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"using DynamicPolynomials, StaticPolynomials\nusing ThreadSafeDicts\nusing Memoize: @memoize\nusing StaticArrays\n\nusing Flux.Zygote: Buffer, @adjoint","category":"page"},{"location":"RBFModels/#Radial-Basis-Function-Models","page":"Module Description","title":"Radial Basis Function Models","text":"","category":"section"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"The sub-module RBFModels provides utilities to work with radial basis function [RBF] models. Given N data sites X =  x^1  x^N   ℝ^n and values Y =  y^1  y^N   ℝ, an interpolating RBF model rcolon ℝ^n  ℝ has the form","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"r(x) = sum_i=1^N w_i φ(  x - x^i _2 ) + p(x)","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"where p is a multivariate polynomial. The radial function φcolon 0 ) to ℝ defines the RBF and we can solve for the coefficients w by solving the interpolation system","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"r( x^i ) stackrel= y^i quad textfor all i=1N","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"The function k() = φ(_2) is radially symmetric around the origin. k is called the kernel of an RBF.","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"We define an abstract super type for radial functions:","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"abstract type RadialFunction <: Function end","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"Each Type that inherits from RadialFunction should implement an evaluation method. It takes the radius/distance ρ = ρ(x) =  x - x^i  from x to a specific centerx^i``.","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"(φ :: RadialFunction )( ρ :: Real ) :: Real = Nothing;\nnothing #hide","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"From an RadialFunction and a vector we can define a shifted kernel function. We allow evaluation for statically sized vectors, too:","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"const AnyVec{T} = Union{Vector{T}, SVector{I, T}, SizedVector{I,T,V}} where {I,V}\n\nstruct ShiftedKernel <: Function\n    φ :: RadialFunction\n    c :: AnyVec\nend\n\nnorm2( vec ) = sqrt(sum( vec.^2 ))\n\n\"Evaluate kernel `k` at `x - k.c`.\"\nfunction (k::ShiftedKernel)( x :: AnyVec )\n    return k.φ( norm2( x .- k.c ) )\nend","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"note: Note\nWhen we have vector data Y  ℝ^k, e.g. from modelling MIMO functions, then Julia easily allows for multiple columns in the righthand side of the interpolation equation system and we get weight vectors for multiple models, that can be thought of as one vector models rcolon ℝ^n to ℝ.","category":"page"},{"location":"RBFModels/#Some-Radial-Functions","page":"Module Description","title":"Some Radial Functions","text":"","category":"section"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"The Gaussian is defined by φ(ρ) = exp left( - (αρ)^2 right), where α is a shape parameter to fine-tune the function.","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"\"\"\"\n    Gaussian( α = 1 ) <: RadialFunction\n\nA `RadialFunction` with\n```math\n    φ(ρ) = \\\\exp( - (α ρ)^2 ).\n```\n\"\"\"\nstruct Gaussian <: RadialFunction\n    α :: Real\n\n    Gaussian( α :: Real = 1 ) = begin\n        @assert α > 0 \"The shape parameter `α` must be positive.\"\n        return new(α)\n    end\nend\n\nfunction ( φ :: Gaussian )( ρ :: Real )\n    exp( - (φ.α * ρ)^2 )\nend","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"The Multiquadric is φ(ρ) = - sqrt 1 + (αρ)^2  and also has a positive shape parameter. We can actually generalize it to the following form:","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"\"\"\"\n    Multiquadric( α = 1, β = 1//2 ) <: RadialFunction\n\nA `RadialFunction` with\n```math\n    φ(ρ) = (-1)^{ \\\\ceil{β} } ( 1 + (αρ)^2 )^β\n```\n\"\"\"\nstruct Multiquadric <: RadialFunction\n    α :: Real   # shape parameter\n    β :: Real   # exponent\n\n    Multiquadric(α = 1, β = 1//2 ) = begin\n        @assert α > 0 \"The shape parameter `α` must be positive.\"\n        @assert β % 1 != 0 \"The exponent must not be an integer.\"\n        @assert β > 0 \"The exponent must be positive.\"\n        new(α,β)\n    end\nend\n\nfunction ( φ :: Multiquadric )( ρ :: Real )\n    (-1)^(ceil(Int, φ.β)) * ( 1 + (φ.α * ρ)^2 )^φ.β\nend","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"Related is the Inverse Multiquadric φ(ρ) = (1+(αρ)^2)^-β is related:","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"\"\"\"\n    InverseMultiquadric( α = 1, β = 1//2 ) <: RadialFunction\n\nA `RadialFunction` with\n```math\n    φ(ρ) = ( 1 + (αρ)^2 )^{-β}\n```\n\"\"\"\nstruct InverseMultiquadric <: RadialFunction\n    α :: Real\n    β :: Real\n\n    InverseMultiquadric( α = 1, β = 1//2 ) = begin\n        @assert α > 0 \"The shape parameter `α` must be positive.\"\n        @assert β > 0 \"The exponent must be positive.\"\n        new(α, β)\n    end\nend\n\nfunction ( φ :: InverseMultiquadric )( ρ :: Real )\n   ( 1 + (φ.α * ρ)^2 )^(-φ.β)\nend","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"The Cubic is φ(ρ) = ρ^3. It can also be generalized:","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"\"\"\"\n    Cubic( β = 3 ) <: RadialFunction\n\nA `RadialFunction` with\n```math\n    φ(ρ) = (-1)^{ \\\\ceil{β}/2 } ρ^β\n```\n\"\"\"\nstruct Cubic <: RadialFunction\n    β :: Real\n\n    Cubic( β :: Real = 3 ) = begin\n        @assert β > 0 \"The exponent `β` must be positive.\"\n        @assert β % 2 != 0 \"The exponent `β` must not be an even number.\"\n        new(β)\n    end\nend\n\nfunction ( φ :: Cubic )( ρ :: Real )\n    (-1)^ceil(Int, φ.β/2 ) * ρ^φ.β\nend","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"The thin plate spline is usually defined via φ(ρ) = ρ^2 log( ρ ). We provide a generalized version, which defaults to φ(ρ) = - ρ^4 log( ρ ).","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"\"\"\"\n    ThinPlateSpline( k = 2 ) <: RadialFunction\n\nA `RadialFunction` with\n```math\n    φ(ρ) = (-1)^{k+1} ρ^{2k} \\\\log(ρ)\n```\n\"\"\"\nstruct ThinPlateSpline <: RadialFunction\n    k :: Int\n\n    ThinPlateSpline( k :: Real = 2 ) = begin\n        @assert k > 0 && k % 1 == 0 \"The parameter `k` must be a positive integer.\"\n        new( Int(k) )\n    end\nend\n\nfunction (φ :: ThinPlateSpline )( ρ :: Real )\n    (-1)^(k+1) * ρ^(2*k) * log( ρ )\nend","category":"page"},{"location":"RBFModels/#Solving-the-Interpolation-System","page":"Module Description","title":"Solving the Interpolation System","text":"","category":"section"},{"location":"RBFModels/#Polynomial-Tail","page":"Module Description","title":"Polynomial Tail","text":"","category":"section"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"For the interpolation system to be solvable we have to choose the right polynomial space for p. Basically, if the RBF Kernel (or the radial function) is conditionally positive definite of order D we have to find a polynomial p with deg p ge D-1.[wendland] If the kernel is CPD of order D=0 we do not have to add an polynomial and can interpolate arbitrary (distinct) data points.","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"cpd_order( :: Gaussian ) = 0\ncpd_order( φ :: Multiquadric ) = ceil( Int, φ.β )\ncpd_order( :: InverseMultiquadric ) = 0\ncpd_order( φ :: Cubic ) = ceil( Int, φ.β/2 )\ncpd_order( φ :: ThinPlateSpline ) = φ.k + 1","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"The dimension of Π_d(ℝ^n), the space of n-variate polynomials of degree at most d, is","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"   Q = binomn+dn","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"which equates to Q = n+1 for linear and Q = (n+2)(n+1)2 for quadratic polynomials. \nWe need p_j_1 le j le Q, a basis of Π_d(ℝ^n).","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"The canonical basis is x_1^α_1 x_2^α_2  x_n^α_n with α_i  0 and Σ_i α_i  d. For bard le d we can recursively get the non-negative integer solutions for Σ_i α_i = bard with the following function:","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"@doc \"\"\"\n    non_negative_solutions( d :: Int, n :: Int)\n\nReturn array of solution vectors [x_1, …, x_n] to the equation\n``x_1 + … + x_n = d``\nwhere the variables are non-negative integers.\n\"\"\"\nfunction non_negative_solutions( d :: Int, n :: Int )\n    if n == 1\n        return d\n    else\n        solutions = [];\n        for i = 0 : d\n            # make RHS smaller by and find all solutions of length `n-1`\n            # then concatenate with difference `d-i`\n            for shorter_solution ∈ non_negative_solutions( i, n - 1)\n                push!( solutions, [ d-i ; shorter_solution ] )\n            end\n        end\n        return solutions\n    end\nend","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"We use DynamicPolynomials.jl to generate the Polyomials. Furthermore, we employ Memoization (via Memoize.jl and ThreadSafeDicts) to save the result for successive usage.","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"@doc \"\"\"\n    canonical_basis( n:: Int, d :: Int )\n\nReturn the canonical basis of the space of `n`-variate\npolynomials of degree at most `d`.\n\"\"\"\n@memoize ThreadSafeDict function canonical_basis( n :: Int, d :: Int )\n    @polyvar Xvar[1 : n]\n    basis = DynamicPolynomials.Polynomial{true,Int}[] # list of basis polynomials\n    for d̄ = 0 : d\n        for multi_exponent ∈ non_negative_solutions( d̄, n )\n            push!( basis, DynamicPolynomials.Polynomial(prod( Xvar .^ multi_exponent ) ))\n        end\n    end\n    return basis\nend","category":"page"},{"location":"RBFModels/#The-equation-system","page":"Module Description","title":"The equation system","text":"","category":"section"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"Set P =  p_j(x^i)   ℝ^N  Q and Φ = φ( x^i - x^j ). In case of interpolation, the linear equation system for the coefficients of r is","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"    beginbmatrix\n    Φ  P \n    P^T  0_Q  Q\n    endbmatrix\n    beginbmatrix\n        w \n        λ\n    endbmatrix\n    =\n    beginbmatrix\n    Y\n    \n    0_Q\n    endbmatrix","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"We want a coefficients function and use the following helpers:","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"\"Evaluate each function in `funcs` on each number/vector in `func_args`,\nso that each column corresponds to a function evaluation.\"\nfunction _func_matrix( funcs, func_args )\n    # easy way:\n    ##[ funcs[j](func_args[i]) for i = eachindex(func_args), j = eachindex(funcs) ]\n\n    # Zygote-compatible\n    Φ = Buffer( func_args[1], length(func_args), length(funcs) )\n    for (i, func) ∈ enumerate(funcs)\n        Φ[:,i] = func.( func_args )\n    end\n    return copy(Φ)\nend","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"For now, we use the \\ operator to solve A * coeff = RHS. Furthermore, we allow for different interpolation sites and RBF centers by allowing for passing kernels.","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"@doc \"\"\"\n    coefficients(sites, values, centers, rad_funcs, polys )\n\nReturn the coefficient matrices `w` and `λ` for an rbf model\n``r(x) = Σ_{i=1}^N wᵢ φ(\\\\|x - x^i\\\\|) + Σ_{j=1}^M λᵢ pᵢ(x)``,\nwhere ``N`` is the length of `rad_funcs` (and `centers`) and ``M``\nis the length of `polys`.\n\nThe arguments are\n* an array of data sites `sites` with vector entries from ``ℝ^n``.\n* an array of data values `values` with vector entries from ``ℝ^k``.\n* an array of `ShiftedKernel`s.\n* an array `polys` of polynomial basis functions.\n\"\"\"\nfunction coefficients(\n    sites :: Vector{ST},\n    values :: Vector{VT},\n    kernels :: Vector{ShiftedKernel},\n    polys :: Vector{<:DynamicPolynomials.Polynomial}\n    ) where {ST,VT}\n\n    n_out = length(values[1])\n\n    # Φ-matrix, N columns =̂ basis funcs, rows =̂ sites\n    N = length(kernels);\n    Φ = _func_matrix( kernels, sites )\n\n    # P-matrix, N × Q\n    Q = length(polys)\n    P = _func_matrix( polys, sites )\n\n    # system matrix A\n    Z = zeros( eltype(Φ), Q, Q )\n    A = [ Φ  P;\n          P' Z ];\n\n    # build rhs (in a Zygote friendly way)\n    F = Buffer( values[1], length(values), length(values[1]) ) ## vals to matrix, columns =̂ outputs\n    for (i, val) ∈ enumerate(values)\n        F[i, :] = val\n    end\n    RHS = [\n        copy(F) ;\n        zeros( eltype(eltype(values)), Q, size(F,2) )\n    ];\n\n    # solve system\n    coeff = A \\ RHS\n\n    # return w and λ\n    if ST <: SVector\n        return SMatrix{N,n_out}(coeff[1 : N, :]), SMatrix{Q, n_out}(coeff[N+1 : end, :])\n    else\n        return coeff[1 : N, :], coeff[N+1 : end, :]\n    end\nend","category":"page"},{"location":"RBFModels/#The-Model-Data-Type","page":"Module Description","title":"The Model Data Type","text":"","category":"section"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"We now have all ingredients to define the model type. We allow for vector valued data sites and determine multiple outputs if needed.","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"First, define some helper functions:","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"function convert_list_of_vecs( vec_type :: Type, list_of_vecs :: Vector{<:Union{Vector,SVector}} )\n    return vec_type.(list_of_vecs)\nend\n\n# allow for providing scalar data\nfunction convert_list_of_vecs( vec_type :: Type, list_of_vecs :: Vector{<:Real} )\n    return convert_list_of_vecs( vec_type, [ [x,] for x ∈ list_of_vecs ] )\nend\n\n# do nothing if types alreay match\nfunction convert_list_of_vecs(::Type{F}, list_of_vecs :: Vector{F} ) where F\n    return list_of_vecs\nend\n\n\"Return array of `ShiftedKernel`s based on `φ` with centers from `sites`.\"\nfunction make_kernels( φ :: RadialFunction, sites :: AnyVec )\n    return [ ShiftedKernel(φ, c) for c ∈ sites ]\nend\n\n\"Return array of `ShiftedKernel`s based functions in `φ_arr` with centers from `sites`.\"\nfunction make_kernels( φ_arr :: Vector{RadialFunction}, sites :: AnyVec )\n    @assert length(φ_arr) == length(sites) \"Provide as many functions `φ_arr` as `sites`.\"\n    return [ ShiftedKernel(φ[i], sites[i]) for i = eachindex( φ_arr ) ]\nend","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"The actual data does not store the coefficients, but rather:","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"a RBFOutputSystems and\na PolynomialSystem (~ vector of polynomials) with num_outputs entries.","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"This should proof beneficial for evaluation and differentiation.","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"struct RBFOutputSystem{S}\n    kernels :: Vector{ShiftedKernel}\n    weights :: Union{Matrix, SMatrix, SizedMatrix}\n\n    num_outputs :: Int\n    num_centers :: Int\nend\n\nconst NumberOrVector{T} = Union{Real,Vector{T}, SVector{I, T}} where I;\n\n\"Return a vector containing the distance of `x` to each kernel center of `RBFOutputSystem`.\"\nfunction _distances( rbf ::  RBFOutputSystem, x :: NumberOrVector )\n    return [ norm2( k.c .- x ) for k ∈ rbf.kernels ]\nend\n\n\"Return the vector [ φ₁(ρ₁) … φₙ(ρₙ) ] = [ k1(x) … kn(x) ]\"\nfunction _kernel_vector( rbf :: RBFOutputSystem, ρ :: Vector{<:Real} )\n    return [ rbf.kernels[i].φ(ρ[i]) for i = 1 : length(ρ) ]\nend\n\n# evaluate at distances, static StaticArrays are used\n\"Evaluate (output `ℓ` of) `rbf` by plugging in distance `ρ[i]` in radial function `o.kernels[i].φ`.\"\nfunction _eval_rbfs_at_ρ( rbf ::  RBFOutputSystem{true}, ρ :: Vector{<:Real}, ℓ :: Union{Int,Nothing} = nothing )\n    W, n_out = isnothing(ℓ) ? (rbf.weights, rbf.num_outputs) : (rbf.weights[:, ℓ],1)  # should be sized\n    vec(SVector{rbf.num_centers}( _kernel_vector( rbf, ρ ) )'W)\nend\n\n# evaluate at distances, normal Vectors are used\nfunction _eval_rbfs_at_ρ(rbf :: RBFOutputSystem{false}, ρ :: Vector{<:Real}, ℓ :: Union{Int,Nothing} = nothing )\n    W = isnothing(ℓ) ? rbf.weights : rbf.weights[:, ℓ]\n    vec(_kernel_vector(rbf, ρ)'W)\nend\n\n\"Evaluate `rbf :: RBFOutputSystem` at site `x`.\"\nfunction ( rbf ::  RBFOutputSystem )( x :: NumberOrVector, ℓ :: Union{Int,Nothing} )\n    ρ = _distances( rbf, x )        # calculate distance vector\n    return _eval_rbfs_at_ρ( rbf, ρ, ℓ ) # eval at distances\nend\n\n# called by RBFModel{S,true}, vector output\n_eval_rbf_sys(  ::Val{true}, rbf :: RBFOutputSystem, x :: NumberOrVector, ℓ :: Union{Int,Nothing} = nothing ) = rbf(x,ℓ)\n# called by RBFModel{S,false}, scalar output\n_eval_rbf_sys( ::Val{false}, rbf :: RBFOutputSystem, x :: NumberOrVector, ℓ :: Union{Int,Nothing} = nothing ) = rbf(x,ℓ)[end]","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"For evaluating polynomials, we build our own PolySystem: It contains a list of StaticPolynomials and a flag indicating a static return type.","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"struct PolySystem{S}\n    polys :: Vector{StaticPolynomials.Polynomial}\n    num_outputs :: Int\nend\n\n_eval_polys( poly_sys :: PolySystem{false}, x :: AnyVec, ℓ :: Nothing ) = [ p(x) for p ∈ poly_sys.polys ]\n_eval_polys( poly_sys :: PolySystem{true}, x :: AnyVec, ℓ :: Nothing ) = SVector{poly_sys.num_outputs}([ p(x) for p ∈ poly_sys.polys ])\n_eval_polys( poly_sys :: PolySystem{false}, x :: AnyVec, ℓ :: Int ) = [ poly_sys.polys[ℓ](x) ]\n_eval_polys( poly_sys :: PolySystem{true}, x :: AnyVec, ℓ :: Int ) = SVector{1}([ poly_sys.polys[ℓ](x) ])\n# StaticPolynomials cannot handle scalar input for variable vectors:\n_eval_polys( poly_sys :: PolySystem{false}, x :: Real, ℓ :: Union{Nothing, Int}) = _eval_polys(poly_sys,[x,],ℓ)\n_eval_polys( poly_sys :: PolySystem{true}, x :: Real, ℓ :: Union{Nothing, Int}) = _eval_polys(poly_sys,SVector{1}([x,]),ℓ)\n\n# called below, from RBFModel, vector output and scalar output\n_eval_poly_sys( ::Val{true}, poly_sys, x, ℓ) = _eval_polys( poly_sys, x, ℓ)\n_eval_poly_sys( ::Val{false}, poly_sys, x, ℓ) = _eval_polys( poly_sys, x, ℓ)[end]","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"The final model struct then is:","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"\"\"\"\n    RBFModel{S,V}\n\n* `S` is `true` or `false` and indicates whether static arrays are used or not.\n* `V` is `true` if vectors should be returned and `false` if scalars are returned.\n\nInitialize via one of the constructors, e.g.,\n    `RBFInterpolationModel( sites, values, φ, poly_deg )`\nto obain an interpolating RBF model.\n\nSee also [`RBFInterpolationModel`](@ref)\n\"\"\"\nstruct RBFModel{S,V}\n    rbf_sys :: RBFOutputSystem{S}\n    poly_sys :: PolySystem{S}\n\n    # Information fields\n    num_vars :: Int\n    num_outputs :: Int\n    num_centers :: Int\nend\n\nfunction (mod :: RBFModel{S,V} )( x :: NumberOrVector, ℓ :: Union{Nothing,Int} = nothing ) where{S,V}\n    rbf_eval = _eval_rbf_sys( Val(V), mod.rbf_sys, x, ℓ )\n    poly_eval = _eval_poly_sys( Val(V), mod.poly_sys, x, ℓ )\n\n    return rbf_eval .+ poly_eval\nend","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"The RBFInterpolationModel constructor takes data sites and values and return an RBFModel that interpolates these points. We allow for passing scalar data and transform it internally.","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"\"\"\"\n    RBFInterpolationModel( sites :: Vector{VS}, values :: Vector{VT}, φ, poly_deg = 1;\n        static_arrays = nothing, vector_output = true ) where {VS<:NumberOrVector, VT<:NumberOrVector}\n\nReturn an RBFModel `m` that is interpolating, i.e., `m(sites[i]) == values[i]` for all\n`i = eachindex(sites)`.\n`φ` should be a `RadialFunction` or a vector of `RadialFunction`s that has the same length\nas `sites` and `values`.\n`poly_deg` specifies the degree of the multivariate polynomial added to the RBF model.\nIt will be reset if needed.\n`static_arrays` is automatically set to `true` if unspecified and the data dimensions are small.\n`vector_output` is ignored if the `values` have length > 1. Elsewise it specifies whether to return\nvectors or scalars when evaluating.\n\"\"\"\nfunction RBFInterpolationModel(\n    s̃ides :: Vector{ VecTypeS },\n    ṽalues :: Vector{ VecTypeV },\n    φ :: Union{RadialFunction,Vector{<:RadialFunction}},\n    poly_deg :: Int = 1;\n    static_arrays :: Union{Bool, Nothing} = nothing,\n    vector_output :: Bool = true,\n    ) where { VecTypeS<:NumberOrVector, VecTypeV<:NumberOrVector }\n\n    # data integrity checks\n    @assert length(s̃ides) == length(ṽalues) \"Provide as many data sites as data labels.\"\n    @assert !isempty(s̃ides) \"Provide at least 1 data site.\"\n    num_vars = length(s̃ides[1])\n    num_outputs = length(ṽalues[1])\n    @assert all( length(s) == num_vars for s ∈ s̃ides ) \"All sites must have same dimension.\"\n    @assert all( length(v) == num_outputs for v ∈ ṽalues ) \"All values must have same dimension.\"\n\n    # use static arrays? if no user preference is set …\n    if isnothing(static_arrays)\n        # … use only if matrices are small\n        static_arrays = (num_vars <= 10 && num_outputs <= 10)\n    end\n\n    # prepare provided training data\n    # use same precision everywhere ( at least half-precision )\n    TypeS = eltype( VecTypeS )\n    TypeV = eltype( VecTypeV )\n    dtype = promote_type( TypeS, TypeV, Float16 )\n    NewVecTypeS = static_arrays ? SVector{ num_vars, dtype } : Vector{dtype}\n    NewVecTypeV = static_arrays ? SVector{ num_outputs, dtype } : Vector{dtype}\n    sites = convert_list_of_vecs( NewVecTypeS, s̃ides )\n    values = convert_list_of_vecs( NewVecTypeV, ṽalues )\n\n    kernels = make_kernels( φ, sites )\n    poly_deg = min( poly_deg, cpd_order(φ) - 1 )\n    poly_basis = canonical_basis( num_vars, poly_deg )\n\n    w, λ = coefficients( sites, values, kernels, poly_basis )\n\n    # build output polynomials\n    poly_vec = StaticPolynomials.Polynomial[]\n    for coeff_ℓ ∈ eachcol( λ )\n        push!( poly_vec, StaticPolynomials.Polynomial( poly_basis'coeff_ℓ ) )\n    end\n    poly_sys = PolySystem{static_arrays}( poly_vec, num_outputs )\n\n    # vector output? (dismiss user choice if labels are vectors)\n    vec_output = num_outputs == 1 ? vector_output : false\n\n    # build RBF system\n    num_centers = length(sites)\n    rbf_sys = RBFOutputSystem{static_arrays}(kernels, w, num_outputs, num_centers)\n\n    return RBFModel{static_arrays, vec_output}(\n        rbf_sys, poly_sys, num_vars, num_outputs, num_centers\n    )\nend","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"We want to provide an alternative constructor for interpolation models so that the radial function can be defined by passing a Symbol or String.","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"const SymbolToRadialConstructor = NamedTuple((\n    :gaussian => Gaussian,\n    :multiquadric => Multiquadric,\n    :inv_multiquadric => InverseMultiquadric,\n    :cubic => Cubic,\n    :thin_plate_spline => ThinPlateSpline\n))\n\nfunction RBFInterpolationModel(\n        s̃ides :: Vector{ <: NumberOrVector },\n        ṽalues :: Vector{ <:NumberOrVector },\n        radial_func :: Union{Symbol, String},\n        constructor_args :: Union{Nothing, Vector{<:Tuple}, Tuple} = nothing,\n        poly_deg :: Int = 1; kwargs ...\n    )\n\n    # which radial function to use?\n    radial_symb = Symbol( lowercase( string( radial_func ) ) )\n    if !(radial_symb ∈ keys(SymbolToRadialConstructor))\n        @warn \"Radial Funtion $(radial_symb) not known, using Gaussian.\"\n        radial_symb = :gaussian\n    end\n    constructor = SymbolToRadialConstructor[radial_symb]\n\n    if isnothing(constructor_args)\n        φ = constructor()\n    elseif constructor_args isa Tuple\n        φ = constructor( constructor_args... )\n    elseif constructor_args isa Vector\n        @assert length(constructor_args) == length(s̃ides)\n        φ = [ constructor( arg_tuple... ) for arg_tuple ∈ constructor_args ]\n    end\n\n    return RBFInterpolationModel( s̃ides, ṽalues, φ, poly_deg; kwargs... )\n\nend","category":"page"},{"location":"RBFModels/#Derivatives","page":"Module Description","title":"Derivatives","text":"","category":"section"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"Assume that φ is two times continuously differentiable. \nWhat is the gradient of an RBF model? Using the chain rule and ξ = x - x^j we get","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"dfracξ_i left( φ( ξ ) right)\n=\nφprime (  ξ  ) cdot\ndfracξ_i (  ξ  )\n=\nφprime (  ξ  ) cdot\ndfracξ_iξ","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"The right term is always bounded, but not well defined for ξ = 0 (see [wild_diss] for details). \nThat is why we require φ(0) stackrel= 0. \nWe have dfracx_i ξ(x) = x - x^j and thus","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"r(x) = sum_i=1^N fracw_i φprime(  x - x^i  ) x - x^i  (x - x^i) + p(x)","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"For the Hessian Hr colon ℝ^n to ℝ^ntimes n we need the gradients of the component functions","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"    ψ_j(ξ) = frac φ( left ξ right )ξ ξ_j","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"Suppose ξ  0. First, using the product rule, we have","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"   dfracξ_i\n   left(\n   frac φ( left ξ right )ξ ξ_j\n   right) =\n   ξ_j\n   dfracξ_i\n   left(\n   frac φ( left ξ right )ξ\n   right)\n   +\n   frac φ( left ξ right )ξ\n   dfracξ_i\n   ξ_j","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"The last term is easy because of","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"fracξ_i ξ_j\n=\nbegincases\n    1  textif i = j\n    0  textelse\nendcases","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"For the first term we find","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"   dfracξ_i\n   left(\n     frac φ( left ξ right )\n      ξ\n   right)\n   =\n   frac\n       φleft(left ξ rightright) _i ξ\n       - ξ _i φleft( left ξ rightright)\n    \n        ξ^2\n    \n    =\n    frac\n        dfracφ(ξ)ξ ξ_i - ξφ(ξ)dfracξ_iξ\n    ξ^2","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"Hence, the gradient of ψ_j is","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"    ψ_j(ξ)\n    =\n    left( fracφ(ξ)ξ^3\n    -\n    fracφ(ξ)ξ^2 right) cdot ξ\n    -fracφ(ξ)ξ e^j","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"where e^j  ℝ^n is all zeros, except e^j_j = 1. For ξ = 0 the first term vanishes due to L'Hôpital's rule:","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"ψ_j(0) = φ(0) e^j","category":"page"},{"location":"RBFModels/#Custom-Adjoints","page":"Module Description","title":"Custom Adjoints","text":"","category":"section"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"For automatic differentiation we need custom adjoints for some StaticArrays:","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"@adjoint (T::Type{<:StaticArrays.SizedMatrix})(x::AbstractMatrix) = T(x), dv -> (nothing, dv)\n@adjoint (T::Type{<:StaticArrays.SVector})(x::AbstractVector) = T(x), dv -> (nothing, dv)","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"[wild_diss]: “Derivative-Free Optimization Algorithms For Computationally Expensive Functions”, Wild, 2009.","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"[wendland]: “Scattered Data Approximation”, Wendland","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"","category":"page"},{"location":"RBFModels/","page":"Module Description","title":"Module Description","text":"This page was generated using Literate.jl.","category":"page"},{"location":"","page":"Home","title":"Home","text":"CurrentModule = RBFModels","category":"page"},{"location":"#RBFModels","page":"Home","title":"RBFModels","text":"","category":"section"},{"location":"","page":"Home","title":"Home","text":"","category":"page"},{"location":"","page":"Home","title":"Home","text":"Modules = [RBFModels]","category":"page"},{"location":"#RBFModels.Cubic","page":"Home","title":"RBFModels.Cubic","text":"Cubic( β = 3 ) <: RadialFunction\n\nA RadialFunction with \n\n    φ(ρ) = (-1)^ ceilβ2  ρ^β\n\n\n\n\n\n","category":"type"},{"location":"#RBFModels.Gaussian","page":"Home","title":"RBFModels.Gaussian","text":"Gaussian( α = 1 ) <: RadialFunction\n\nA RadialFunction with \n\n    φ(ρ) = exp( - (α ρ)^2 )\n\n\n\n\n\n","category":"type"},{"location":"#RBFModels.InverseMultiquadric","page":"Home","title":"RBFModels.InverseMultiquadric","text":"InverseMultiquadric( α = 1, β = 1//2 ) <: RadialFunction\n\nA RadialFunction with \n\n    φ(ρ) = ( 1 + (αρ)^2 )^-β\n\n\n\n\n\n","category":"type"},{"location":"#RBFModels.Multiquadric","page":"Home","title":"RBFModels.Multiquadric","text":"Multiquadric( α = 1, β = 1//2 ) <: RadialFunction\n\nA RadialFunction with \n\n    φ(ρ) = (-1)^ ceilβ  ( 1 + (αρ)^2 )^β\n\n\n\n\n\n","category":"type"},{"location":"#RBFModels.RBFModel","page":"Home","title":"RBFModels.RBFModel","text":"RBFModel{S,V}\n\nS is true or false and indicates whether static arrays are used or not.\nV is true if vectors should be returned and false if scalars are returned.\n\nInitialize via one of the constructors, e.g.,     RBFInterpolationModel( sites, values, φ, poly_deg ) to obain an interpolating RBF model.\n\nSee also RBFInterpolationModel\n\n\n\n\n\n","category":"type"},{"location":"#RBFModels.RBFOutputSystem-Tuple{Union{Vector{T}, Real, StaticArrays.SVector{I, T}} where {T, I}, Union{Nothing, Int64}}","page":"Home","title":"RBFModels.RBFOutputSystem","text":"Evaluate rbf :: RBFOutputSystem at site x.\n\n\n\n\n\n","category":"method"},{"location":"#RBFModels.ShiftedKernel-Tuple{Union{Vector{T}, StaticArrays.SVector{I, T}, StaticArrays.SizedVector{I, T, V}} where {T, I, V}}","page":"Home","title":"RBFModels.ShiftedKernel","text":"Evaluate kernel k at x - k.c.\n\n\n\n\n\n","category":"method"},{"location":"#RBFModels.ThinPlateSpline","page":"Home","title":"RBFModels.ThinPlateSpline","text":"ThinPlateSpline( k = 2 ) <: RadialFunction\n\nA RadialFunction with \n\n    φ(ρ) = (-1)^k+1 ρ^2k log(ρ)\n\n\n\n\n\n","category":"type"},{"location":"#RBFModels.RBFInterpolationModel-Union{Tuple{VecTypeV}, Tuple{VecTypeS}, Tuple{Vector{VecTypeS}, Vector{VecTypeV}, Union{RBFModels.RadialFunction, Vector{var\"#s20\"} where var\"#s20\"<:RBFModels.RadialFunction}}, Tuple{Vector{VecTypeS}, Vector{VecTypeV}, Union{RBFModels.RadialFunction, Vector{var\"#s21\"} where var\"#s21\"<:RBFModels.RadialFunction}, Int64}} where {VecTypeS<:(Union{Vector{T}, Real, StaticArrays.SVector{I, T}} where {T, I}), VecTypeV<:(Union{Vector{T}, Real, StaticArrays.SVector{I, T}} where {T, I})}","page":"Home","title":"RBFModels.RBFInterpolationModel","text":"RBFInterpolationModel( sites :: Vector{VS}, values :: Vector{VT}, φ, poly_deg = 1; \n    static_arrays = nothing, vector_output = true ) where {VS<:NumberOrVector, VT<:NumberOrVector}\n\nReturn an RBFModel m that is interpolating, i.e., m(sites[i]) == values[i] for all  i = eachindex(sites). φ should be a RadialFunction or a vector of RadialFunctions that has the same length  as sites and values. poly_deg specifies the degree of the multivariate polynomial added to the RBF model. It will be reset if needed. static_arrays is automatically set to true if unspecified and the data dimensions are small. vector_output is ignored if the values have length > 1. Elsewise it specifies whether to return  vectors or scalars when evaluating.\n\n\n\n\n\n","category":"method"},{"location":"#RBFModels._distances-Tuple{RBFModels.RBFOutputSystem, Union{Vector{T}, Real, StaticArrays.SVector{I, T}} where {T, I}}","page":"Home","title":"RBFModels._distances","text":"Return a vector containing the distance of x to each kernel center of RBFOutputSystem.\n\n\n\n\n\n","category":"method"},{"location":"#RBFModels._eval_rbfs_at_ρ","page":"Home","title":"RBFModels._eval_rbfs_at_ρ","text":"Evaluate (output ℓ of) rbf by plugging in distance ρ[i] in radial function o.kernels[i].φ.\n\n\n\n\n\n","category":"function"},{"location":"#RBFModels._func_matrix-Tuple{Any, Any}","page":"Home","title":"RBFModels._func_matrix","text":"Evaluate each function in funcs on each number/vector in func_args,  so that each column corresponds to a function evaluation.\n\n\n\n\n\n","category":"method"},{"location":"#RBFModels._kernel_vector-Tuple{RBFModels.RBFOutputSystem, Vector{var\"#s10\"} where var\"#s10\"<:Real}","page":"Home","title":"RBFModels._kernel_vector","text":"Return the vector [ φ₁(ρ₁) … φₙ(ρₙ) ] = [ k1(x) … kn(x) ]\n\n\n\n\n\n","category":"method"},{"location":"#RBFModels.canonical_basis-Tuple{Int64, Int64}","page":"Home","title":"RBFModels.canonical_basis","text":"canonical_basis( n:: Int, d :: Int )\n\nReturn the canonical basis of the space of n-variate  polynomials of degree at most d.\n\n\n\n\n\n","category":"method"},{"location":"#RBFModels.coefficients-Union{Tuple{VT}, Tuple{ST}, Tuple{Vector{ST}, Vector{VT}, Vector{RBFModels.ShiftedKernel}, Vector{var\"#s11\"} where var\"#s11\"<:DynamicPolynomials.Polynomial}} where {ST, VT}","page":"Home","title":"RBFModels.coefficients","text":"coefficients(sites, values, centers, rad_funcs, polys )\n\nReturn the coefficient matrices w and λ for an rbf model  r(x) = Σ_i=1^N wᵢ φ(x - x^i) + Σ_j=1^M λᵢ pᵢ(x), where N is the length of rad_funcs (and centers) and M is the length of polys.\n\nThe arguments are \n\nan array of data sites sites with vector entries from ℝ^n.\nan array of data values values with vector entries from ℝ^k.\nan array of ShiftedKernels.\nan array polys of polynomial basis functions.\n\n\n\n\n\n","category":"method"},{"location":"#RBFModels.make_kernels-Tuple{RBFModels.RadialFunction, Union{Vector{T}, StaticArrays.SVector{I, T}, StaticArrays.SizedVector{I, T, V}} where {T, I, V}}","page":"Home","title":"RBFModels.make_kernels","text":"Return array of ShiftedKernels based on φ with centers from sites.\n\n\n\n\n\n","category":"method"},{"location":"#RBFModels.make_kernels-Tuple{Vector{RBFModels.RadialFunction}, Union{Vector{T}, StaticArrays.SVector{I, T}, StaticArrays.SizedVector{I, T, V}} where {T, I, V}}","page":"Home","title":"RBFModels.make_kernels","text":"Return array of ShiftedKernels based functions in φ_arr with centers from sites.\n\n\n\n\n\n","category":"method"},{"location":"#RBFModels.non_negative_solutions-Tuple{Int64, Int64}","page":"Home","title":"RBFModels.non_negative_solutions","text":"non_negative_solutions( d :: Int, n :: Int)\n\nReturn array of solution vectors [x1, …, xn] to the equation x_1 +  + x_n = d where the variables are non-negative integers.\n\n\n\n\n\n","category":"method"}]
}