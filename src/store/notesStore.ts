import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type Note = {
  id: string
  title: string
  subject: string
  topic: string
  content: string
  createdAt: string
  updatedAt: string
  isRead: boolean
  isDemoData: boolean
  favorite?: boolean
}

export type NoteDraft = Pick<Note, 'title' | 'subject' | 'topic' | 'content'>

export type NoteFilters = {
  subject?: string
  topic?: string
  unreadOnly?: boolean
  favoritesOnly?: boolean
}

export type NoteSortKey = 'createdAt' | 'updatedAt' | 'title'
export type NoteSortDirection = 'asc' | 'desc'

export type NotesState = {
  notes: Note[]
  isDemoData: boolean
}

export type NotesActions = {
  addNote: (draft: NoteDraft) => string
  updateNote: (noteId: string, updates: Partial<NoteDraft>) => void
  deleteNote: (noteId: string) => void
  markNoteRead: (noteId: string, isRead?: boolean) => void
  toggleFavorite: (noteId: string) => void
}

export type NotesStore = NotesState & NotesActions

const demoNotes: Note[] = [
  {
    id: 'demo-biology-cellular-respiration',
    title: 'Cellular respiration overview',
    subject: 'Biology',
    topic: 'Cellular respiration',
    content: `Glycolysis, the Krebs cycle, and the electron transport chain work together to release energy from glucose into ATP. Cellular respiration is the master metabolic pathway through which aerobic organisms catabolize nutrients into usable cellular currency.

> [!NOTE]
> **Overall Chemical Reaction:**
> C₆H₁₂O₆ + 6 O₂ → 6 CO₂ + 6 H₂O + ~30–32 ATP (ΔG°' = -2870 kJ/mol)

## Stage 1: Glycolysis (Cytoplasmic Realm)
Glycolysis occurs in the cytosol and operates independently of molecular oxygen:
- **Energy Investment Phase:** Consumes 2 ATP molecules to phosphorylate glucose into fructose-1,6-bisphosphate via hexokinase and phosphofructokinase-1 (PFK-1).
- **Cleavage Phase:** 6-carbon intermediate splits into two 3-carbon triose phosphates (G3P and DHAP).
- **Energy Payoff Phase:** Produces 4 ATP via substrate-level phosphorylation and reduces 2 NAD⁺ to 2 NADH.
- **Net Yield:** 2 Pyruvate + 2 ATP + 2 NADH per glucose.

## Stage 2: Pyruvate Oxidation (The Link Reaction)
Pyruvate translocates across the mitochondrial outer membrane and into the matrix via pyruvate translocase:
- Catalyzed by the multienzyme **Pyruvate Dehydrogenase Complex (PDC)**.
- Each pyruvate loses a carboxyl group as CO₂.
- Reduces NAD⁺ to NADH and couples the remaining acetyl group to Coenzyme A, generating **Acetyl-CoA**.

## Stage 3: The Citric Acid (Krebs) Cycle
Occurring entirely within the mitochondrial matrix, this 8-step cyclical pathway completely oxidizes acetyl carbons:
1. **Oxaloacetate (4C)** condenses with **Acetyl-CoA (2C)** to synthesize **Citrate (6C)** (Citrate Synthase).
2. Isomerization to isocitrate, followed by two oxidative decarboxylation steps releasing 2 CO₂ and generating 2 NADH.
3. Substrate-level phosphorylation yields 1 GTP (equivalent to 1 ATP).
4. Oxidation of succinate to fumarate reduces FAD to FADH₂.
5. Regeneration of oxaloacetate completes the cycle while generating another NADH.
- **Per Glucose Yield (2 Turns):** 4 CO₂, 6 NADH, 2 FADH₂, 2 ATP/GTP.

## Stage 4: Oxidative Phosphorylation & ATP Synthase
The electron transport chain (ETC) embedded in the inner mitochondrial cristae:
- **Complex I (NADH Dehydrogenase):** Pumps 4 H⁺ per NADH.
- **Complex II (Succinate Dehydrogenase):** Transfers electrons from FADH₂ to ubiquinone (Q) without pumping protons.
- **Complex III (Cytochrome bc₁ Complex):** Pumps 4 H⁺ via Q-cycle.
- **Complex IV (Cytochrome c Oxidase):** Translocates 2 H⁺ and reduces terminal oxygen: ½ O₂ + 2 H⁺ + 2 e⁻ → H₂O.
- **ATP Synthase (Complex V):** Harnesses the proton-motive force (electrochemical gradient) via rotary catalysis to phosphorylate ADP into ATP (~2.5 ATP/NADH, ~1.5 ATP/FADH₂).

| Process | Location | O₂ Required? | ATP Yield (Substrate) | Reducing Equivalents |
| :--- | :--- | :--- | :--- | :--- |
| **Glycolysis** | Cytosol | No | 2 Net ATP | 2 NADH |
| **Pyruvate Link** | Matrix | Indirectly | 0 ATP | 2 NADH |
| **Krebs Cycle** | Matrix | Indirectly | 2 ATP/GTP | 6 NADH, 2 FADH₂ |
| **ETC & Chemiosmosis** | Inner Membrane | Yes | ~26–28 ATP | Oxidizes all NADH/FADH₂ |

> [!TAKEAWAY]
> **Key Exam Anchor:** Cyanide and carbon monoxide inhibit Complex IV, completely halting the proton gradient and aerobic ATP production. Without oxygen as the terminal electron acceptor, cells revert to lactic acid fermentation yielding only 2 ATP per glucose.`,
    createdAt: '2026-01-15T09:00:00.000Z',
    updatedAt: '2026-01-15T09:00:00.000Z',
    isRead: true,
    isDemoData: true,
  },
  {
    id: 'demo-mathematics-quadratics',
    title: 'Quadratic equations study guide',
    subject: 'Mathematics',
    topic: 'Quadratic equations',
    content: `Use factoring, completing the square, or the quadratic formula to solve ax² + bx + c = 0. Quadratic equations form the foundational bedrock of algebra, physics trajectories, profit optimization, and parabolic curve modeling.

> [!NOTE]
> **Standard Form:**
> ax² + bx + c = 0 (where a ≠ 0, and a, b, c ∈ ℝ)

## Method 1: Factoring & The Zero-Product Property
When a quadratic expression can be factored into linear binomials (px + q)(rx + s) = 0:
- If A · B = 0, then either A = 0 or B = 0.
- Example: x² - 5x + 6 = 0 factors into (x - 2)(x - 3) = 0, giving roots x = 2 and x = 3.
- Most rapid technique when coefficients are integers and discriminant is a perfect square.

## Method 2: Completing the Square
Rewriting the quadratic expression into a squared binomial plus a constant:
1. Divide through by leading coefficient a: x² + (b/a)x + c/a = 0.
2. Move constant term to RHS: x² + (b/a)x = -c/a.
3. Add the square of half the linear coefficient: [b / (2a)]² to both sides.
4. Factor the left side: (x + b/(2a))² = (b² - 4ac) / (4a²).
5. Extract square roots to solve for x. (This step directly proves the Quadratic Formula).

## Method 3: The Quadratic Formula & The Discriminant
For any arbitrary quadratic equation with real or complex coefficients:
\`\`\`math
x = (-b ± √(b² - 4ac)) / (2a)
\`\`\`

The discriminant **Δ = b² - 4ac** determines the algebraic nature and geometric intersection of the roots:
- **Δ > 0:** Two distinct real roots. The parabola crosses the x-axis at two unique points.
- **Δ = 0:** Exactly one real repeated root (double root). The vertex of the parabola touches the x-axis tangentially.
- **Δ < 0:** Two complex conjugate roots (x = α ± βi). The parabola never touches or intersects the real x-axis.

## Vertex Form & Parabolic Geometry
The graph of y = ax² + bx + c is a symmetric vertical parabola:
- **Vertex Coordinates (h, k):**
  h = -b / (2a),   k = c - b² / (4a)
- **Axis of Symmetry:** Vertical line x = -b / (2a).
- **Direction of Opening:** If a > 0, opens upward (concave up, minimum at vertex). If a < 0, opens downward (concave down, maximum at vertex).

> [!TIP]
> **Vieta's Formulas (Mental Math Shortcut):**
> For roots r₁ and r₂:
> - Sum of roots: r₁ + r₂ = -b / a
> - Product of roots: r₁ · r₂ = c / a
> Use Vieta's formulas to verify solutions in seconds without re-solving!`,
    createdAt: '2026-01-16T10:30:00.000Z',
    updatedAt: '2026-01-16T10:30:00.000Z',
    isRead: false,
    isDemoData: true,
  },
  {
    id: 'demo-history-world-war-two',
    title: 'World War II key events',
    subject: 'History',
    topic: 'World War II',
    content: `A concise timeline of the major turning points and alliances of World War II. Spanning from 1939 to 1945, the conflict reshaped the global balance of power, ended European colonial dominance, and established the contemporary geopolitical world order.

> [!NOTE]
> **Primary Alliances:**
> - **Allied Powers:** United Kingdom, Soviet Union (after June 1941), United States (after Dec 1941), Free France, China.
> - **Axis Powers:** Nazi Germany, Imperial Japan, Fascist Italy.

## Phase 1: Outbreak & Blitzkrieg (1939–1940)
- **Sept 1, 1939:** German invasion of Poland triggers British and French declarations of war, ending the policy of appeasement.
- **May–June 1940:** Fall of France via the Ardennes flank; British expeditionary forces evacuate at Dunkirk.
- **July–Oct 1940:** The Battle of Britain — Royal Air Force Fighter Command defeats the Luftwaffe, preventing Operation Sea Lion.

## Phase 2: Global Escalation (1941)
- **June 22, 1941 (Operation Barbarossa):** Germany launches the largest land invasion in human history against the USSR, opening the brutal Eastern Front.
- **Dec 7, 1941:** Japanese preemptive strike on Pearl Harbor brings the United States officially into both the Pacific and European theaters.

## Phase 3: The Great Turning Points (1942–1943)
- **June 1942 (Battle of Midway):** US naval aircraft sink 4 Japanese fleet aircraft carriers, shifting naval dominance in the Pacific theater.
- **Nov 1942 (Second Battle of El Alamein):** Montgomery’s 8th Army halts Rommel in North Africa, safeguarding Suez oil corridors.
- **Feb 1943 (Battle of Stalingrad):** Annihilation of the German 6th Army; marks the strategic turning point on the Eastern Front from which Axis forces permanently retreat.

## Phase 4: Allied Counter-Offensive & Victory (1944–1945)
- **June 6, 1944 (D-Day / Operation Overlord):** Combined Allied amphibious assault in Normandy opens the Western Front.
- **Feb 1945 (Yalta Conference):** Churchill, Roosevelt, and Stalin coordinate postwar European zones of occupation and the founding of the United Nations.
- **May 8, 1945 (V-E Day):** Unconditional surrender of Nazi Germany following the Soviet capture of Berlin.
- **Aug 6 & 9, 1945:** Atomic bombings of Hiroshima and Nagasaki, followed by Soviet invasion of Manchuria, prompt Emperor Hirohito’s surrender (V-J Day, Sept 2, 1945).

> [!TAKEAWAY]
> **Postwar Geopolitical Architecture:** The war dismantled European multi-polar hegemony, ushering in the bipolar Cold War rivalry between the United States and the USSR, the Bretton Woods economic system (IMF & World Bank), and the universal declaration of human rights.`,
    createdAt: '2026-01-17T14:00:00.000Z',
    updatedAt: '2026-01-17T14:00:00.000Z',
    isRead: false,
    isDemoData: true,
  },
  {
    id: 'demo-cs-graph-algorithms',
    title: 'Graph Algorithms & Shortest Path Mastery',
    subject: 'Computer Science',
    topic: 'Graph Theory',
    content: `Graph algorithms model interconnected networks, routing topologies, social graphs, and dependency resolution. Selecting the optimal traversal or shortest-path algorithm requires balancing time complexity, space constraints, and edge weight constraints.

> [!NOTE]
> **Graph Representation Trade-Offs:**
> - **Adjacency Matrix:** Space O(V²). Fast O(1) edge lookup, but inefficient for sparse graphs.
> - **Adjacency List:** Space O(V + E). Optimal for sparse graphs and standard traversal algorithms.

## Traversal Foundations: BFS vs DFS
- **Breadth-First Search (BFS):**
  - Data Structure: FIFO Queue.
  - Time: O(V + E), Space: O(V).
  - Crucial Property: Explores vertices in level-order rings. Guarantees the shortest path in unweighted graphs.
- **Depth-First Search (DFS):**
  - Data Structure: LIFO Stack / Recursion.
  - Time: O(V + E), Space: O(V) (call stack).
  - Key Uses: Topological sorting in Directed Acyclic Graphs (DAGs), connected components, cycle detection, strongly connected components (Tarjan / Kosaraju).

## Shortest Path Algorithms Comparison

### 1. Dijkstra’s Algorithm
- **Paradigm:** Greedy with Min-Heap Priority Queue.
- **Complexity:** O((V + E) log V) using binary heap; O(E + V log V) with Fibonacci heap.
- **Constraint:** Strictly requires non-negative edge weights (w(u, v) ≥ 0).

### 2. Bellman-Ford Algorithm
- **Paradigm:** Dynamic Programming edge relaxation over (V - 1) iterations.
- **Complexity:** O(V · E).
- **Advantage:** Correctly computes shortest paths with negative edge weights and reliably detects reachable negative-weight cycles.

### 3. A* Search Algorithm
- **Paradigm:** Best-First Heuristic Search.
- **Evaluation Function:** f(n) = g(n) + h(n), where g(n) is actual cost from start to n, and h(n) is admissible heuristic estimate to target.
- **Optimality:** Guaranteed optimal if h(n) is admissible (never overestimates) and consistent (monotonic).

| Algorithm | Edge Weights | Time Complexity | Best Suited For |
| :--- | :--- | :--- | :--- |
| **BFS** | Unweighted (all 1) | O(V + E) | Peer-to-peer routing, shortest hops |
| **Dijkstra** | Non-negative only | O((V + E) log V) | Road navigation, GPS, OSPF routing |
| **Bellman-Ford** | Negative allowed | O(V · E) | Financial arbitrage, distance-vector BGP |
| **Floyd-Warshall** | All-pairs | O(V³) | Small dense networks, transitive closure |
| **A* Search** | Non-negative | O(E) to O(b^d) | Game AI pathfinding, robotics planning |

> [!TIP]
> **Implementation Pattern (Dijkstra Min-Heap):**
> Always verify \`if (currentDist > dist[u]) continue;\` when popping from priority queue to discard stale distance entries and prevent redundant relaxations!`,
    createdAt: '2026-01-18T11:00:00.000Z',
    updatedAt: '2026-01-18T11:00:00.000Z',
    isRead: false,
    isDemoData: true,
  },
  {
    id: 'demo-cs-distributed-systems',
    title: 'Distributed Systems Architecture & CAP Theorem',
    subject: 'Computer Science',
    topic: 'Distributed Systems',
    content: `Distributed systems coordinate independent networked computers to act as a unified, resilient computing platform. Navigating latency, partial failures, network partitions, and data synchronization requires rigorous architectural tradeoffs.

> [!NOTE]
> **The 8 Fallacies of Distributed Computing (L. Peter Deutsch):**
> 1. The network is reliable. 2. Latency is zero. 3. Bandwidth is infinite. 4. The network is secure. 5. Topology doesn't change. 6. There is one administrator. 7. Transport cost is zero. 8. The network is homogeneous.

## The CAP Theorem (Eric Brewer)
In any asynchronous network prone to communication failures, a distributed data store can guarantee at most two out of three properties simultaneously:
- **Consistency (Linearizability):** Every read receives the most recent write or an error. All nodes see identical data at the same logical moment.
- **Availability:** Every non-failing node returns a non-error response for every request (without guaranteeing it is the latest write).
- **Partition Tolerance:** The system continues to operate despite arbitrary dropped or delayed network packets between nodes.

> [!IMPORTANT]
> **The Real Choice:** Because physical network partitions (P) are unavoidable in real infrastructure (fiber cuts, router reboots, GC pauses), distributed systems must architecturally choose between **CP (Consistency)** or **AP (Availability)** during partitions.

## Distributed Consensus: Raft vs Paxos
Consensus protocols guarantee that a cluster of replicated state machines agree on an ordered sequence of state changes:
- **Raft Consensus Protocol:**
  - Decomposes consensus into explicit sub-problems: Leader Election, Log Replication, and Safety.
  - Randomized election timeouts prevent split-vote deadlocks.
  - Quorum requirement: Writes require acknowledgment from a strict majority (⌊N/2⌋ + 1) nodes.
- **Paxos:** Mathematically elegant dual-phase commit (Prepare/Promise, Accept/Accepted), but notoriously complex to implement in production environments.

## Scalability & Data Partitioning Patterns
- **Consistent Hashing:** Maps both cluster nodes and data keys to a circular 32-bit/128-bit ring hash space. Adding or removing a node only migrates K/N keys rather than re-hashing all keys.
- **Replication Topologies:**
  - *Single-Leader (Primary-Replica):* Reads scale across replicas; single bottleneck for writes.
  - *Multi-Leader:* Suitable for multi-datacenter deployments; requires conflict resolution (CRDTs or Last-Write-Wins).
  - *Leaderless (Dynamo style):* Relies on quorum read (R) and write (W) parameters: if R + W > N, linearizable reads are guaranteed.

> [!TAKEAWAY]
> **Caching Strategy Rule of Thumb:** Use **Cache-Aside** for read-heavy workloads with cache tolerance. Use **Write-Through** for zero data loss with moderate write latency. Always attach TTLs to prevent memory leaks and permanent cache inconsistency.`,
    createdAt: '2026-01-19T08:30:00.000Z',
    updatedAt: '2026-01-19T08:30:00.000Z',
    isRead: false,
    isDemoData: true,
  },
  {
    id: 'demo-neuroscience-memory',
    title: 'Neurobiology of Memory & Cognitive Flow',
    subject: 'Neuroscience',
    topic: 'Cognitive Neuroscience',
    content: `Memory is the biological encoding, consolidation, and retrieval of neural representations. Modern cognitive neuroscience demonstrates that memory is not a passive recording device, but an active, plastic reconstruction orchestrated by synaptic modifications.

> [!NOTE]
> **Baddeley's Multi-Component Working Memory Model:**
> - **Central Executive:** Attentional focus, cognitive inhibition, task switching.
> - **Phonological Loop:** Inner voice holding verbal/auditory information for 1.5–2 seconds.
> - **Visuospatial Sketchpad:** Mental rotation, spatial positioning, imagery.
> - **Episodic Buffer:** Integrates multi-modal streams into coherent conscious episodes.

## Cellular Mechanism: Long-Term Potentiation (LTP)
LTP is the persistent strengthening of synapses based on recent patterns of activity, considered the cellular basis of learning:
1. High-frequency action potentials depolarize the postsynaptic dendritic spine.
2. Depolarization dislodges the electrostatic **magnesium (Mg²⁺) plug** blocking the pore of **NMDA receptors**.
3. Calcium (Ca²⁺) rushes into the postsynaptic neuron, activating protein kinases (CaMKII and PKC).
4. Kinase cascades trigger insertion of additional **AMPA receptors** into the postsynaptic membrane.
5. The synapse exhibits increased sensitivity to future glutamate release, lowering firing threshold.

## Systems Consolidation & Sleep Architecture
- **Two-Stage Memory Architecture:**
  - Fast, high-capacity initial encoding occurs in the **hippocampus** (medial temporal lobe).
  - Slow, permanent integration transfers representations to the **neocortex**.
- **Slow-Wave Sleep (SWS):** Hippocampal sharp-wave ripples replay daytime neural firing sequences at 10x speed, synchronizing cortical slow oscillations to bind semantic networks.
- **REM Sleep:** Consolidates emotional valence, procedural memory, and creative association discovery.

## Evidence-Based Cognitive Mastery Protocols

### 1. Active Recall (The Testing Effect)
Generating an answer from memory produces significantly deeper retention than passive re-reading or highlighting. The retrieval effort stimulates synaptic reconsolidation pathways.

### 2. Spaced Repetition (The Ebbinghaus Forgetting Curve)
Memories decay exponentially over time: R = e^(-t/S). Reviewing material at expanding intervals just as recall probability dips to ~80% resets the forgetting curve with a shallower decay slope.

### 3. Interleaving vs Blocking
Studying related but distinct topics in mixed sequences trains cognitive discrimination (selecting the right formula/strategy) rather than rote procedural execution.

> [!TIP]
> **The Ultradian 90-Minute Focus Sprint:**
> Cognitive flow operates in 90-minute ultradian biological rhythms. Maximum neurochemical focus (acetylcholine + dopamine) peaks between 25 and 75 minutes, followed by a necessary 15-minute mental reset.`,
    createdAt: '2026-01-20T14:15:00.000Z',
    updatedAt: '2026-01-20T14:15:00.000Z',
    isRead: false,
    isDemoData: true,
  },
  {
    id: 'demo-math-linear-algebra',
    title: 'Linear Algebra for Machine Learning: SVD & Eigendecomposition',
    subject: 'Mathematics',
    topic: 'Linear Algebra',
    content: `Linear algebra provides the mathematical language for deep neural networks, computer vision, and dimensionality reduction. Matrix transformations map vector spaces, while decomposition theorems isolate dominant statistical patterns.

> [!NOTE]
> **Fundamental Theorem of Linear Algebra:**
> For any m × n matrix A: Rank(A) + Nullity(A) = n. The row space and null space are orthogonal complements in ℝⁿ.

## 1. Eigenvalues & Eigenvectors
For a square linear operator A ∈ ℝⁿˣⁿ, an eigenvector v is a non-zero vector whose direction remains invariant under transformation, scaled only by factor λ:
\`\`\`math
A v = λ v  ⟺  (A - λ I) v = 0
\`\`\`
- Non-trivial solutions exist if and only if **det(A - λ I) = 0** (the characteristic polynomial).
- **Spectral Theorem:** Any symmetric real matrix (A = Aᵀ) is orthogonally diagonalizable: A = Q Λ Qᵀ, where Q is orthogonal (QᵀQ = I) and Λ contains real eigenvalues.

## 2. Singular Value Decomposition (SVD)
While eigendecomposition requires square matrices, SVD factorizes **any** arbitrary m × n real matrix:
\`\`\`math
A = U Σ Vᵀ
\`\`\`
- **U (m × m):** Orthogonal matrix of left-singular vectors (eigenvectors of A Aᵀ).
- **Σ (m × n):** Diagonal matrix of non-negative singular values σ₁ ≥ σ₂ ≥ ... ≥ σᵣ > 0 (square roots of non-zero eigenvalues of AᵀA).
- **V (n × n):** Orthogonal matrix of right-singular vectors (eigenvectors of AᵀA).

## 3. Principal Component Analysis (PCA)
PCA finds orthogonal axes of maximum variance in high-dimensional feature datasets:
1. Center the data matrix X (zero mean).
2. Compute the empirical sample covariance matrix C = (1/n) Xᵀ X.
3. Compute eigenvectors of C; the eigenvector with the largest eigenvalue represents the **first principal component**.
4. Project data onto top k eigenvectors to minimize reconstruction loss (Eckart-Young-Mirsky Theorem).

| Concept | Mathematical Equation | Geometric Meaning | Key Application |
| :--- | :--- | :--- | :--- |
| **Dot Product** | u · v = ‖u‖ ‖v‖ cos(θ) | Projection of u onto v | Cosine similarity in NLP |
| **Matrix Rank** | dim(Col(A)) | Independent dimensions | Matrix compression |
| **Eigenvector** | Av = λv | Direction of pure scaling | PageRank, stability |
| **SVD** | A = U Σ Vᵀ | Rotation → Scale → Rotation | Image compression, LSA |
| **Determinant** | det(A) | Volume scaling factor | Coordinate transformations |

> [!TAKEAWAY]
> **Numerical Conditioning Note:** The condition number κ(A) = σ_max / σ_min measures how sensitive matrix inversion or linear regression is to small input perturbations. If κ(A) is very large, the matrix is ill-conditioned and requires regularization (e.g., Ridge / L2 penalty).`,
    createdAt: '2026-01-21T09:45:00.000Z',
    updatedAt: '2026-01-21T09:45:00.000Z',
    isRead: false,
    isDemoData: true,
  },
  {
    id: 'demo-physics-relativity',
    title: 'Special Relativity & Spacetime Mechanics',
    subject: 'Physics',
    topic: 'Modern Physics',
    content: `Special relativity reconciles Newtonian mechanics with Maxwell's electrodynamics by abandoning absolute Newtonian time. Formulated by Albert Einstein in 1905, it establishes that measurements of time and space are relative to the observer's inertial frame of reference.

> [!NOTE]
> **The Two Postulates of Special Relativity:**
> 1. **Principle of Relativity:** The laws of physics take identical mathematical forms in all inertial (non-accelerating) reference frames.
> 2. **Constancy of the Speed of Light:** The speed of light in vacuum c (299,792,458 m/s) is invariant for all observers, regardless of the motion of the source or observer.

## The Lorentz Factor & Lorentz Transformations
Replacing classical Galilean transformations, the Lorentz factor γ governs relativistic adjustments:
\`\`\`math
γ = 1 / √(1 - v² / c²)    (as v → c, γ → ∞)
\`\`\`

For relative motion along the x-axis:
- x' = γ (x - v t)
- t' = γ (t - v x / c²)
- y' = y,   z' = z

## Fundamental Relativistic Phenomena

### 1. Time Dilation
Clocks in relative motion tick slower compared to proper time τ measured in a clock's rest frame:
\`\`\`math
Δt = γ Δt₀    (where Δt₀ is proper time)
\`\`\`
- **Empirical Proof:** Atmospheric muons with rest lifetime of 2.2 microseconds reach Earth's surface from the upper atmosphere because their relativistic lifetime extends by factor γ ≈ 20.

### 2. Length Contraction
Objects in motion are measured to be contracted along the direction of motion:
\`\`\`math
L = L₀ / γ    (where L₀ is proper length)
\`\`\`
- Perpendicular dimensions remain completely unchanged.

### 3. Relativistic Energy & Momentum
- Relativistic Momentum: p = γ m₀ v
- Total Energy: E = γ m₀ c²
- **The Invariant Mass Energy-Momentum Relation:**
\`\`\`math
E² = (p c)² + (m₀ c²)²
\`\`\`
- For massless particles (e.g., photons): m₀ = 0, so E = p c.

## The Invariant Spacetime Interval (Minkowski Geometry)
While Δt and Δx differ between observers, the spacetime interval Δs² is an absolute invariant in 4-dimensional Minkowski spacetime:
\`\`\`math
Δs² = c² Δt² - (Δx² + Δy² + Δz²)
\`\`\`
- **Δs² > 0 (Timelike):** Causal connection possible; particle can travel between events.
- **Δs² = 0 (Lightlike / Null):** Events connected by a light ray.
- **Δs² < 0 (Spacelike):** Causal communication impossible without exceeding speed of light.

> [!TAKEAWAY]
> **The Twin Paradox Resolution:** The returning twin who travels into space at 0.95c and returns to Earth has physically accelerated and turned around, changing inertial frames. Spacetime worldline length (proper time ∫ dτ) is shorter for the traveler; thus, the traveling twin is physically younger upon return.`,
    createdAt: '2026-01-22T16:20:00.000Z',
    updatedAt: '2026-01-22T16:20:00.000Z',
    isRead: false,
    isDemoData: true,
  },
]

export function createInitialNotesState(): NotesState {
  return {
    notes: demoNotes.map((note) => ({ ...note })),
    isDemoData: true,
  }
}

const fallbackStorage: Storage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
  clear: () => undefined,
  key: () => null,
  get length() { return 0 },
}

function getSafeStorage(): Storage {
  if (typeof window === 'undefined') return fallbackStorage

  try {
    const storage = window.localStorage
    const probeKey = '__mindforge_notes_storage_probe__'
    storage.setItem(probeKey, 'ok')
    storage.removeItem(probeKey)
    return storage
  } catch {
    return fallbackStorage
  }
}

const safeStorage = createJSONStorage(() => getSafeStorage())

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object')
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && Number.isFinite(Date.parse(value))
}

function parseNote(value: unknown): Note | null {
  if (!isRecord(value)) return null

  const id = typeof value.id === 'string' ? value.id.trim() : ''
  const title = typeof value.title === 'string' ? value.title.trim() : ''
  const subject = typeof value.subject === 'string' ? value.subject.trim() : ''
  const topic = typeof value.topic === 'string' ? value.topic.trim() : ''
  if (!id || !title || !subject || !topic || typeof value.content !== 'string') return null
  if (!isTimestamp(value.createdAt) || !isTimestamp(value.updatedAt)) return null

  return {
    id,
    title,
    subject,
    topic,
    content: value.content,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    isRead: typeof value.isRead === 'boolean' ? value.isRead : false,
    isDemoData: typeof value.isDemoData === 'boolean' ? value.isDemoData : false,
    favorite: typeof value.favorite === 'boolean' ? value.favorite : false,
  }
}

function sanitizeState(input: unknown): NotesState {
  const defaults = createInitialNotesState()
  if (!isRecord(input)) return defaults

  if (!Array.isArray(input.notes)) return defaults
  if (input.notes.length === 0) return { notes: [], isDemoData: false }

  const notes = input.notes.map(parseNote).filter((note): note is Note => note !== null)
  if (notes.length === 0) return defaults

  return {
    notes,
    isDemoData: typeof input.isDemoData === 'boolean'
      ? input.isDemoData
      : notes.every((note) => note.isDemoData),
  }
}

function normalizeText(value: string): string {
  return value.trim().toLocaleLowerCase()
}

export function searchNotes(notes: Note[], query: string): Note[] {
  const normalizedQuery = normalizeText(query)
  if (!normalizedQuery) return [...notes]

  return notes.filter((note) => [note.title, note.subject, note.topic, note.content]
    .some((field) => normalizeText(field).includes(normalizedQuery)))
}

export function filterNotes(notes: Note[], filters: NoteFilters = {}): Note[] {
  const subject = filters.subject ? normalizeText(filters.subject) : ''
  const topic = filters.topic ? normalizeText(filters.topic) : ''

  return notes.filter((note) => {
    const matchesSubject = !subject || normalizeText(note.subject) === subject
    const matchesTopic = !topic || normalizeText(note.topic) === topic
    const matchesReadState = !filters.unreadOnly || !note.isRead
    const matchesFavorites = !filters.favoritesOnly || Boolean(note.favorite)
    return matchesSubject && matchesTopic && matchesReadState && matchesFavorites
  })
}

export function sortNotes(
  notes: Note[],
  key: NoteSortKey = 'updatedAt',
  direction: NoteSortDirection = 'desc',
): Note[] {
  const multiplier = direction === 'asc' ? 1 : -1

  return [...notes].sort((left, right) => {
    const leftValue = left[key]
    const rightValue = right[key]
    const comparison = key === 'title'
      ? leftValue.localeCompare(rightValue)
      : leftValue.localeCompare(rightValue)

    return comparison === 0 ? left.id.localeCompare(right.id) : comparison * multiplier
  })
}

export function selectNotes(
  notes: Note[],
  options: NoteFilters & { query?: string; sortKey?: NoteSortKey; sortDirection?: NoteSortDirection } = {},
): Note[] {
  const searched = searchNotes(notes, options.query ?? '')
  const filtered = filterNotes(searched, options)
  return sortNotes(filtered, options.sortKey, options.sortDirection)
}

function makeNoteId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function nowAfter(previous: string | undefined): string {
  const current = Date.now()
  const previousTime = previous ? Date.parse(previous) : Number.NaN
  return new Date(Math.max(current, Number.isFinite(previousTime) ? previousTime + 1 : current)).toISOString()
}

export const useNotesStore = create<NotesStore>()(
  persist(
    (set) => ({
      ...createInitialNotesState(),
      addNote: (draft) => {
        const title = draft.title.trim()
        const subject = draft.subject.trim()
        const topic = draft.topic.trim()
        if (!title || !subject || !topic) return ''

        const createdAt = nowAfter(undefined)
        const note: Note = {
          id: makeNoteId(),
          title,
          subject,
          topic,
          content: draft.content,
          createdAt,
          updatedAt: createdAt,
          isRead: false,
          isDemoData: false,
          favorite: false,
        }

        set((state) => ({ notes: [...state.notes, note], isDemoData: false }))
        return note.id
      },
      updateNote: (noteId, updates) => set((state) => {
        const note = state.notes.find((item) => item.id === noteId)
        if (!note) return state

        const nextTitle = updates.title === undefined ? note.title : updates.title.trim()
        const nextSubject = updates.subject === undefined ? note.subject : updates.subject.trim()
        const nextTopic = updates.topic === undefined ? note.topic : updates.topic.trim()
        if (!nextTitle || !nextSubject || !nextTopic) return state

        return {
          notes: state.notes.map((item) => item.id === noteId ? {
            ...item,
            title: nextTitle,
            subject: nextSubject,
            topic: nextTopic,
            content: updates.content === undefined ? item.content : updates.content,
            updatedAt: nowAfter(item.updatedAt),
            isDemoData: false,
          } : item),
          isDemoData: false,
        }
      }),
      deleteNote: (noteId) => set((state) => {
        const notes = state.notes.filter((note) => note.id !== noteId)
        return notes.length === state.notes.length ? state : { notes, isDemoData: false }
      }),
      markNoteRead: (noteId, isRead = true) => set((state) => {
        const note = state.notes.find((item) => item.id === noteId)
        if (!note || note.isRead === isRead) return state

        return {
          notes: state.notes.map((item) => item.id === noteId ? {
            ...item,
            isRead,
            updatedAt: nowAfter(item.updatedAt),
            isDemoData: false,
          } : item),
          isDemoData: false,
        }
      }),
      toggleFavorite: (noteId) => set((state) => {
        const note = state.notes.find((item) => item.id === noteId)
        if (!note) return state

        return {
          notes: state.notes.map((item) => item.id === noteId ? {
            ...item,
            favorite: !item.favorite,
            updatedAt: nowAfter(item.updatedAt),
            isDemoData: false,
          } : item),
          isDemoData: false,
        }
      }),
    }),
    {
      name: 'mindforge-notes',
      storage: safeStorage,
      partialize: (state) => ({
        notes: state.notes,
        isDemoData: state.isDemoData,
      }),
      merge: (persisted, current) => ({ ...current, ...sanitizeState(persisted) }),
    },
  ),
)
