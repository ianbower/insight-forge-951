export interface CompanyDims {
  autonomy: number;
  manufacturing: number;
  software: number;
  supply_chain: number;
  customer: number;
  sustainability: number;
}

export interface TechStackItem {
  name: string;
  cat: string;
  desc: string;
}

export interface CompanySource {
  label: string;
  url: string;
}

export interface Company {
  id: string;
  name: string;
  region: string;
  overallScore: number;
  tier: 'Pioneer' | 'Leader' | 'Fast Follower' | 'Developer' | 'Experimenter';
  description: string;
  dims: CompanyDims;
  tags: string[];
  techStack: TechStackItem[];
  keyUseCases: string[];
  investmentLevel: string;
  aiLeader: string;
  sources: CompanySource[];
}

export interface UseCase {
  id: string;
  title: string;
  domain: string;
  agenticLevel: number;
  description: string;
  challenge: string;
  solution: string;
  benefits: string;
  keyAiTasks: string;
  adopters: string[];
  value: number;
  complexity: number;
  techStack: string[];
  example: string;
}

export const DOMAINS = ['Autonomous', 'Manufacturing', 'Customer', 'Supply Chain', 'Software', 'Sustainability', 'R&D'];

export const DIM_KEYS: (keyof CompanyDims)[] = ['autonomy', 'manufacturing', 'software', 'supply_chain', 'customer', 'sustainability'];

export const DIM_NAMES: Record<string, string> = {
  autonomy: 'Autonomy',
  manufacturing: 'Manufacturing',
  software: 'Software Dev',
  supply_chain: 'Supply Chain',
  customer: 'Customer Exp',
  sustainability: 'Sustainability',
};

export const COMPANY_COLORS: Record<string, string> = {
  'Tesla': '#ef4444',
  'Toyota': '#f97316',
  'BMW Group': '#3b82f6',
  'Mercedes-Benz': '#8b5cf6',
  'General Motors': '#06b6d4',
  'Volkswagen Group': '#10b981',
  'Hyundai-Kia': '#f59e0b',
  'Ford Motor Co.': '#6366f1',
  'Stellantis': '#ec4899',
  'BYD': '#84cc16',
};

export const TECH_CAT_STYLES: Record<string, { bg: string; text: string }> = {
  'tp-aws': { bg: 'rgba(255,153,0,0.15)', text: '#ff9900' },
  'tp-azure': { bg: 'rgba(0,120,212,0.15)', text: '#4aa5f0' },
  'tp-gcp': { bg: 'rgba(66,133,244,0.15)', text: '#4285f4' },
  'tp-nvidia': { bg: 'rgba(118,185,0,0.15)', text: '#76b900' },
  'tp-openai': { bg: 'rgba(16,185,129,0.15)', text: '#10b981' },
  'tp-custom': { bg: 'rgba(139,92,246,0.15)', text: '#8b5cf6' },
  'tp-alibaba': { bg: 'rgba(255,106,0,0.15)', text: '#ff6a00' },
  'tp-samsung': { bg: 'rgba(20,40,160,0.15)', text: '#6b7fdb' },
};

export function scoreColor(score: number): string {
  if (score >= 85) return '#22c55e';
  if (score >= 75) return '#14b8a6';
  if (score >= 65) return '#f59e0b';
  if (score >= 55) return '#f97316';
  return '#ef4444';
}

export function tierBadgeStyle(tier: string): { bg: string; text: string } {
  const map: Record<string, { bg: string; text: string }> = {
    'Pioneer': { bg: 'rgba(34,197,94,0.15)', text: '#22c55e' },
    'Leader': { bg: 'rgba(20,184,166,0.15)', text: '#14b8a6' },
    'Fast Follower': { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b' },
    'Developer': { bg: 'rgba(249,115,22,0.15)', text: '#f97316' },
    'Experimenter': { bg: 'rgba(239,68,68,0.15)', text: '#ef4444' },
  };
  return map[tier] || map['Experimenter'];
}

export function agenticBadge(level: number): { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' } {
  const map: Record<number, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
    1: { label: 'L1 Reactive', variant: 'outline' },
    2: { label: 'L2 Tool-Using', variant: 'secondary' },
    3: { label: 'L3 Planning', variant: 'default' },
    4: { label: 'L4 Autonomous', variant: 'default' },
  };
  return map[level] || map[1];
}

export function getCompanyColor(name: string): string {
  if (COMPANY_COLORS[name]) return COMPANY_COLORS[name];
  const hash = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const fallbacks = ['#FFC400', '#19A3FC', '#0072BC', '#CFD8FC', '#7fd1b9', '#E6B600', '#6f7fb7', '#d45a52'];
  return fallbacks[hash % fallbacks.length];
}

export const DEFAULT_COMPANIES: Company[] = [
  {
    id: 'tesla', name: 'Tesla', region: 'USA', overallScore: 94, tier: 'Pioneer',
    description: 'Vertically integrated AI company. Custom silicon (Dojo, AI6), proprietary FSD neural networks, Giga-scale data flywheel from 6M+ vehicles.',
    dims: { autonomy: 98, manufacturing: 88, software: 96, supply_chain: 72, customer: 90, sustainability: 68 },
    tags: ['FSD', 'Dojo', 'Robotaxi', 'Optimus', 'Cortex'],
    techStack: [
      { name: 'Custom AI6 / D1 Chips', cat: 'tp-custom', desc: 'Proprietary silicon for training & inference' },
      { name: 'Dojo Supercomputer', cat: 'tp-custom', desc: 'In-house exaflop-scale neural net training' },
      { name: 'NVIDIA H100', cat: 'tp-nvidia', desc: 'GPU clusters for simulation & R&D' },
      { name: 'AWS (partial)', cat: 'tp-aws', desc: 'Cloud overflow compute' },
      { name: 'Cortex AI Cluster', cat: 'tp-custom', desc: 'Internal training supercluster' },
    ],
    keyUseCases: ['Full Self-Driving (FSD)', 'Robotaxi autonomous operations', 'Predictive battery management', 'Optimus humanoid robots', 'AI-driven OTA updates'],
    investmentLevel: '$5B+ (AI capex cumulative)',
    aiLeader: 'Elon Musk (CEO / AI lead)',
    sources: [{ label: 'TechCrunch — Dojo Timeline', url: 'https://techcrunch.com/2025/09/02/teslas-dojo-a-timeline/' }],
  },
  {
    id: 'toyota', name: 'Toyota', region: 'Japan', overallScore: 82, tier: 'Leader',
    description: "Multi-agent AI system (O-Beya) built on Azure OpenAI/GPT-4o. Woven by Toyota's MISRA-compliant code agent achieves 81.5% auto-correction. Aggressive agentic AI rollout.",
    dims: { autonomy: 74, manufacturing: 84, software: 88, supply_chain: 82, customer: 76, sustainability: 88 },
    tags: ['O-Beya', 'GPT-4o', 'Azure', 'Multi-agent', 'Woven'],
    techStack: [
      { name: 'Microsoft Azure OpenAI', cat: 'tp-azure', desc: 'GPT-4o for O-Beya multi-agent engineering system' },
      { name: 'Azure Cosmos DB', cat: 'tp-azure', desc: 'Vector search & conversation history' },
      { name: 'Azure Functions', cat: 'tp-azure', desc: 'API orchestration layer' },
      { name: 'AutoGen (Microsoft)', cat: 'tp-azure', desc: 'Multi-agent orchestration framework' },
      { name: 'GitHub Enterprise', cat: 'tp-custom', desc: 'CI/CD for MISRA-compliant code gen' },
      { name: 'AWS (Connected)', cat: 'tp-aws', desc: 'Connected car platform & voice assistant' },
    ],
    keyUseCases: ['O-Beya AI engineering agents', 'MISRA-compliant auto-code correction', 'Connected vehicle platform', 'Hydrogen/EV R&D optimization', 'Manufacturing productivity agents'],
    investmentLevel: 'Multi-billion (Azure + in-house)',
    aiLeader: 'Newly appointed NA CTO (2025)',
    sources: [{ label: 'Microsoft — Toyota O-Beya', url: 'https://news.microsoft.com/source/asia/features/toyota-is-deploying-ai-agents-to-harness-the-collective-wisdom-of-engineers-and-innovate-faster/' }],
  },
  {
    id: 'bmw', name: 'BMW Group', region: 'Germany', overallScore: 80, tier: 'Leader',
    description: 'Azure-first strategy. Neue Klasse platform integrates Alibaba Qwen LLM + Alexa+ in China/global. NVIDIA Omniverse digital twins. 10x more efficient data delivery via Azure.',
    dims: { autonomy: 76, manufacturing: 82, software: 84, supply_chain: 80, customer: 82, sustainability: 76 },
    tags: ['Neue Klasse', 'Azure', 'Alibaba Qwen', 'Alexa+', 'NVIDIA'],
    techStack: [
      { name: 'Microsoft Azure', cat: 'tp-azure', desc: '10x data delivery efficiency; core cloud backbone' },
      { name: 'Alibaba Qwen LLM', cat: 'tp-alibaba', desc: 'IPA for Neue Klasse — China market (Yan AI/Banma)' },
      { name: 'Amazon Alexa+', cat: 'tp-aws', desc: 'Global Neue Klasse in-vehicle assistant (2026+)' },
      { name: 'NVIDIA Omniverse', cat: 'tp-nvidia', desc: 'Digital twin manufacturing simulation' },
      { name: 'AWS (ADAS dev)', cat: 'tp-aws', desc: 'Generative AI for 2025 Neue Klasse ADAS' },
    ],
    keyUseCases: ['Intelligent Personal Assistant (IPA)', 'Neue Klasse digital cockpit AI', 'Manufacturing digital twins', 'ADAS with AWS generative AI', 'Multi-agent cockpit coordination'],
    investmentLevel: 'Major (Azure multi-year)',
    aiLeader: 'New US Tech Office Head (July 2025)',
    sources: [{ label: 'SBD Automotive — OEM AI 2025', url: 'https://www.sbdautomotive.com/post/how-major-automakers-are-positioning-themselves-to-master-ai-in-2025' }],
  },
  {
    id: 'mercedes', name: 'Mercedes-Benz', region: 'Germany', overallScore: 79, tier: 'Leader',
    description: 'First to deploy Google Gemini + ChatGPT4o simultaneously in-vehicle (CLA). MBUX AI Agent powered by Vertex AI. Level 3 autonomy deployed. Multi-AI vendor strategy.',
    dims: { autonomy: 82, manufacturing: 74, software: 82, supply_chain: 70, customer: 88, sustainability: 78 },
    tags: ['Gemini', 'ChatGPT', 'MBUX', 'Level 3', 'Vertex AI'],
    techStack: [
      { name: 'Google Gemini / Vertex AI', cat: 'tp-gcp', desc: 'MBUX AI Agent — navigation, multi-turn conversation' },
      { name: 'Microsoft Bing / ChatGPT-4o', cat: 'tp-azure', desc: '"Hey Mercedes" — first combined AI in-vehicle' },
      { name: 'Google Cloud Automotive Agent', cat: 'tp-gcp', desc: 'First production deployment of this agent type' },
      { name: 'Google Maps Platform', cat: 'tp-gcp', desc: 'Contextual POI search & navigation' },
      { name: 'Microsoft Azure AI', cat: 'tp-azure', desc: 'Battery AI & development toolchain' },
    ],
    keyUseCases: ['Gemini-powered MBUX assistant', 'ChatGPT-4o + Bing voice navigation', 'Level 3 autonomous Drive Pilot', 'AI battery performance optimization', 'Conversational multi-turn dialogue'],
    investmentLevel: 'Significant (Google + Microsoft)',
    aiLeader: 'Digital/AI leadership via Stuttgart HQ',
    sources: [{ label: 'Google Cloud Press — Mercedes Gemini', url: 'https://www.googlecloudpresscorner.com/2025-01-13-Mercedes-Benz-and-Google-Partner-on-AI-powered-Conversational-Search-within-Navigation-Systems' }],
  },
  {
    id: 'gm', name: 'General Motors', region: 'USA', overallScore: 77, tier: 'Fast Follower',
    description: 'Google Gemini in-vehicle (2026), NVIDIA Omniverse digital twins, C-suite AI leader added March 2025. Cruise autonomous (paused/relaunching). Factory digital twins across plants.',
    dims: { autonomy: 72, manufacturing: 84, software: 76, supply_chain: 80, customer: 74, sustainability: 74 },
    tags: ['Gemini 2026', 'NVIDIA Omniverse', 'Cruise', 'Digital Twin', 'DRIVE AGX'],
    techStack: [
      { name: 'Google Gemini', cat: 'tp-gcp', desc: 'In-vehicle AI assistant — deploying 2026' },
      { name: 'NVIDIA Omniverse', cat: 'tp-nvidia', desc: 'Assembly line digital twin simulation' },
      { name: 'NVIDIA DRIVE AGX (Blackwell)', cat: 'tp-nvidia', desc: 'Next-gen vehicle compute: 1000 TOPS' },
      { name: 'NVIDIA GPUs', cat: 'tp-nvidia', desc: 'Simulation & software validation' },
      { name: 'Google Cloud', cat: 'tp-gcp', desc: 'Connected services & AI workloads' },
    ],
    keyUseCases: ['Omniverse factory digital twins', 'Gemini in-vehicle assistant', 'Cruise autonomous driving system', 'DRIVE AGX vehicle compute', 'AI-driven production optimization'],
    investmentLevel: 'Major (Google + NVIDIA multi-year)',
    aiLeader: 'New C-suite AI exec added Mar 2025',
    sources: [{ label: 'SBD Automotive — GM + NVIDIA', url: 'https://www.sbdautomotive.com/post/how-major-automakers-are-positioning-themselves-to-master-ai-in-2025' }],
  },
  {
    id: 'byd', name: 'BYD', region: 'China', overallScore: 76, tier: 'Fast Follower',
    description: 'Vertical integration champion. Proprietary battery AI, semiconductor manufacturing & EV control systems. DiPilot ADAS suite. Fastest growing EV maker with deep AI in manufacturing.',
    dims: { autonomy: 76, manufacturing: 86, software: 72, supply_chain: 82, customer: 72, sustainability: 68 },
    tags: ['DiPilot', 'Blade Battery AI', 'Vertical Integration', 'Custom SoC'],
    techStack: [
      { name: 'BYD Custom SoC', cat: 'tp-custom', desc: 'Proprietary semiconductor for EV control & AI' },
      { name: 'Huawei (select models)', cat: 'tp-custom', desc: 'Intelligent driving system integration' },
      { name: 'Qualcomm Snapdragon', cat: 'tp-custom', desc: 'Cockpit compute platform' },
      { name: 'BYD AI Cloud', cat: 'tp-custom', desc: 'Internal cloud for manufacturing & data' },
    ],
    keyUseCases: ['DiPilot ADAS autonomous system', 'Blade battery AI management', 'Vertical semiconductor integration', 'AI quality control in factories', 'Energy grid intelligent charging'],
    investmentLevel: 'Major (in-house R&D vertical)',
    aiLeader: 'Wang Chuanfu (CEO-led AI strategy)',
    sources: [{ label: 'AutoVision 2025 Report', url: 'https://www.autovisionawards.com/zh/reports/report-2025-automotive-brand-value.php' }],
  },
  {
    id: 'volkswagen', name: 'Volkswagen Group', region: 'Germany', overallScore: 75, tier: 'Fast Follower',
    description: '1,200+ AI applications running. Factory Cloud (DPP) on AWS deployed across 43 factories. ChatGPT in 2025 Jetta/ID.4. AWS 5-year extension. Double-digit million EUR savings.',
    dims: { autonomy: 66, manufacturing: 86, software: 74, supply_chain: 82, customer: 72, sustainability: 70 },
    tags: ['Factory Cloud', 'AWS DPP', 'ChatGPT', '1200 AI apps', 'XPeng'],
    techStack: [
      { name: 'Amazon Web Services', cat: 'tp-aws', desc: 'Factory Cloud / DPP — 43 factories (5-yr extension)' },
      { name: 'ChatGPT (OpenAI)', cat: 'tp-openai', desc: 'In-vehicle voice for 2025 Jetta, GLI, ID.4' },
      { name: 'AWS Digital Production Platform', cat: 'tp-aws', desc: 'AI-powered manufacturing operations hub' },
      { name: 'XPeng Partnership', cat: 'tp-custom', desc: 'Mid-tier BEV model development for China' },
    ],
    keyUseCases: ['DPP Factory Cloud across 43 sites', 'ChatGPT in-vehicle voice assistant', 'Quality control AI (1,200+ apps)', 'Supply chain demand forecasting', 'XPeng EV co-development'],
    investmentLevel: 'Major (AWS 5-yr, double-digit M€ savings)',
    aiLeader: 'Hauke Stars (Board IT)',
    sources: [{ label: 'Reuters — VW AWS Extension', url: 'https://www.reuters.com/business/autos-transportation/volkswagen-extends-amazon-cloud-partnership-save-costs-with-ai-2025-08-28/' }],
  },
  {
    id: 'hyundai', name: 'Hyundai-Kia', region: 'South Korea', overallScore: 74, tier: 'Fast Follower',
    description: 'NVIDIA partnership spans SDV, ADAS, manufacturing & Omniverse. NLP-powered connected vehicles. Kia ML-adaptive ADAS. Boston Dynamics integration for factory robotics.',
    dims: { autonomy: 74, manufacturing: 78, software: 74, supply_chain: 72, customer: 78, sustainability: 68 },
    tags: ['NVIDIA', 'Omniverse', 'Boston Dynamics', 'NLP', 'SDV'],
    techStack: [
      { name: 'NVIDIA (Full Suite)', cat: 'tp-nvidia', desc: 'SDV, ADAS, manufacturing & Cosmos simulation' },
      { name: 'NVIDIA Omniverse', cat: 'tp-nvidia', desc: 'Physical AI and digital twin for factories' },
      { name: 'NVIDIA Cosmos', cat: 'tp-nvidia', desc: 'Virtual simulation for AV development' },
      { name: 'Custom NLP Stack', cat: 'tp-custom', desc: 'Hyundai NLP for connected vehicle interaction' },
    ],
    keyUseCases: ['NVIDIA-powered SDV platform', 'Adaptive ADAS with ML (Kia)', 'Connected vehicle NLP assistant', 'Boston Dynamics factory robots', 'Cosmos AV simulation'],
    investmentLevel: 'Significant (NVIDIA multi-year MOU)',
    aiLeader: 'Group AI Leadership, Seoul',
    sources: [{ label: 'SBD Automotive', url: 'https://www.sbdautomotive.com/post/how-major-automakers-are-positioning-themselves-to-master-ai-in-2025' }],
  },
  {
    id: 'ford', name: 'Ford Motor Co.', region: 'USA', overallScore: 68, tier: 'Developer',
    description: 'AI in product development saves weeks of engineering effort. Data governance foundation built for AI scale. Accelerating AI cost-reduction programs post-tariff pressures.',
    dims: { autonomy: 58, manufacturing: 72, software: 68, supply_chain: 70, customer: 64, sustainability: 74 },
    tags: ['AI Dev Efficiency', 'BlueCruise', 'Cost Reduction', 'Data Foundation'],
    techStack: [
      { name: 'Microsoft Azure', cat: 'tp-azure', desc: 'Core cloud & AI toolchain for development' },
      { name: 'AWS (partial)', cat: 'tp-aws', desc: 'Cloud services and data workloads' },
      { name: 'Ford AI Platform', cat: 'tp-custom', desc: 'Internal AI tooling for engineering teams' },
    ],
    keyUseCases: ['AI product development (weeks saved)', 'BlueCruise hands-free driving', 'Supply chain disruption forecasting', 'AI-driven manufacturing quality', 'Cost optimization agents'],
    investmentLevel: 'Moderate (cost-focused)',
    aiLeader: 'AI/Data leadership (accelerated 2025)',
    sources: [{ label: 'WardsAuto — Ford AI Programs', url: 'https://www.wardsauto.com/news/archive-auto-volkswagen-group-AWS-partnership-AI-cost-savings/758911/' }],
  },
  {
    id: 'stellantis', name: 'Stellantis', region: 'EU/USA', overallScore: 62, tier: 'Developer',
    description: 'Software-first transformation underway. STLA Brain architecture. NVIDIA partnership for Level 4 AV. Leveraging Azure cloud services. Focus on software-defined vehicle transition.',
    dims: { autonomy: 64, manufacturing: 64, software: 66, supply_chain: 60, customer: 60, sustainability: 58 },
    tags: ['STLA Brain', 'NVIDIA L4', 'AWS', 'SDV', 'Software-first'],
    techStack: [
      { name: 'NVIDIA (Level 4 AV)', cat: 'tp-nvidia', desc: 'Partnership for Level 4 autonomous vehicles' },
      { name: 'Microsoft Azure', cat: 'tp-azure', desc: 'Software-first transformation infrastructure' },
      { name: 'AWS', cat: 'tp-aws', desc: 'Cloud services & connected vehicle platform' },
    ],
    keyUseCases: ['STLA Brain software platform', 'Level 4 AV with NVIDIA', 'Connected services AI', 'OTA software update management', 'Digital cockpit experiences'],
    investmentLevel: 'Growing (restructuring focus)',
    aiLeader: 'Software-first leadership team',
    sources: [{ label: 'Microsoft CES 2025', url: 'https://www.microsoft.com/en-us/industry/blog/manufacturing-and-mobility/2025/01/07/ces-2025-advancing-the-future-of-automotive-and-mobility/' }],
  },
];

export const DEFAULT_USE_CASES: UseCase[] = [
  // Autonomous
  { id:'AV01', title:'Full Self-Driving (FSD) Neural Networks', domain:'Autonomous', agenticLevel:4, description:'End-to-end neural network replaces 300k+ lines of rule code. Trained on billions of miles from fleet. Enables L2–L4 autonomous driving.', challenge:'Achieving safe real-world autonomous navigation without pre-mapped roads', solution:'End-to-end neural networks trained on massive real-world video fleet data via Dojo supercomputer', benefits:'Safer driving, scalable autonomy, continuous OTA improvement', keyAiTasks:'Computer vision, reinforcement learning, neural net training at scale', adopters:['Tesla'], value:5, complexity:5, techStack:['Custom silicon (D1/AI6)', 'Dojo supercomputer', 'PyTorch (inferred)', 'CUDA'], example:'FSD V13 uses 4.2x more data, higher-resolution video; Tesla cortex enables weekly model improvements' },
  { id:'AV02', title:'Level 3 Highway Drive Pilot', domain:'Autonomous', agenticLevel:3, description:'Conditional autonomous driving on highways with driver override capability. Legally certified in Germany and US states.', challenge:'Achieving regulatory approval for conditional autonomy in multiple jurisdictions', solution:'LiDAR + camera fusion with AI planning; ISO 26262 certified system', benefits:'First legal L3 system, OEM differentiation, improved safety', keyAiTasks:'Sensor fusion, path planning, real-time obstacle detection', adopters:['Mercedes-Benz'], value:5, complexity:5, techStack:['Nvidia Drive platform', 'LiDAR / Camera fusion', 'ISO 26262 AI'], example:'Drive Pilot operates on motorways at up to 60 km/h; driver legally not required to monitor road' },
  { id:'AV03', title:'DiPilot ADAS Suite', domain:'Autonomous', agenticLevel:3, description:'Comprehensive driver assistance with lane-keeping, auto-braking, and urban NOA across BYD model range.', challenge:'Offering competitive intelligent driving at mass-market price points', solution:'Proprietary SoC combined with camera+radar fusion for cost-effective ADAS', benefits:'Competitive feature parity with Tesla/NIO at lower cost', keyAiTasks:'Object detection, decision tree, path prediction', adopters:['BYD'], value:4, complexity:4, techStack:['BYD SoC', 'Qualcomm Snapdragon Ride', 'Camera/Radar fusion'], example:'BYD Seal uses DiPilot 300 for full highway automation on roads with poor lane markings' },
  { id:'AV04', title:'ADAS ML-Adaptive System', domain:'Autonomous', agenticLevel:2, description:'Kia integrates machine learning into ADAS so systems adapt to individual driver profiles and local road conditions over time.', challenge:'Generic ADAS does not adapt to different driving styles or regional road conditions', solution:'On-device ML learns driver preferences and road context, recalibrating intervention thresholds', benefits:'Personalized safety, fewer false positives, higher user trust', keyAiTasks:'Supervised learning, driver profiling, edge inference', adopters:['Hyundai-Kia'], value:4, complexity:3, techStack:['NVIDIA DRIVE', 'On-device ML', 'Telemetry feedback loop'], example:'Kia EV9 adjusts lane-keeping sensitivity after recognizing driver consistently overrides in urban areas' },
  { id:'AV05', title:'Cosmos Virtual AV Simulation', domain:'Autonomous', agenticLevel:3, description:'NVIDIA Cosmos generates photorealistic virtual worlds to train and validate autonomous driving models at trillion-mile scale.', challenge:'Real-world data collection for rare/dangerous scenarios is impractical', solution:'Generative AI creates unlimited synthetic edge-case scenarios for AV training', benefits:'90%+ reduction in physical test miles needed, faster safety validation', keyAiTasks:'World model generation, domain randomization, sim-to-real transfer', adopters:['General Motors', 'Hyundai-Kia'], value:5, complexity:4, techStack:['NVIDIA Cosmos', 'NVIDIA Omniverse', 'PhysX simulation'], example:'GM Cruise uses Cosmos to simulate 10,000 variants of a complex intersection in one day' },
  // Manufacturing
  { id:'MF01', title:'AI Visual Defect Detection', domain:'Manufacturing', agenticLevel:2, description:'Computer vision systems inspect vehicle bodies, paint, and components at line speed with superhuman accuracy.', challenge:'Human inspectors miss 15-20% of defects; inspection creates bottlenecks', solution:'High-res cameras + CNN models detect surface defects at 99.5%+ accuracy in real-time', benefits:'99.5% detection rate, 3x inspection speed, lower scrap and rework', keyAiTasks:'Image classification, anomaly detection, real-time inference', adopters:['BMW Group', 'Toyota', 'Volkswagen Group', 'BYD'], value:5, complexity:2, techStack:['NVIDIA Jetson', 'Custom CNN models', 'Edge inference servers'], example:'BMW Dingolfing plant catches 0.3mm paint imperfections invisible to the human eye at 60 vehicles/hour' },
  { id:'MF02', title:'Predictive Maintenance AI', domain:'Manufacturing', agenticLevel:2, description:'ML models predict equipment failures 2-4 weeks before they occur by analyzing vibration, temperature, and acoustic sensor data.', challenge:'Unplanned downtime costs $50k-$500k per hour in automotive plants', solution:'Time-series ML models on sensor feeds detect early degradation patterns before failure', benefits:'40-60% reduction in unplanned downtime; optimized spare parts inventory', keyAiTasks:'Time-series forecasting, anomaly detection, remaining useful life estimation', adopters:['Toyota', 'Volkswagen Group', 'BMW Group', 'General Motors'], value:5, complexity:3, techStack:['AWS IoT Greengrass', 'Azure IoT Hub', 'Custom ML models', 'Siemens MindSphere'], example:'VW Wolfsburg predicts CNC spindle failure 18 days early, avoiding €400k production stoppage' },
  { id:'MF03', title:'Digital Twin Factory Simulation', domain:'Manufacturing', agenticLevel:3, description:'NVIDIA Omniverse creates physics-accurate virtual replicas of entire production lines for optimization, layout planning, and what-if analysis.', challenge:'Physical line changes cost millions and take weeks; wrong decisions are irreversible', solution:'Omniverse digital twin simulates line changes, robot paths, and throughput before physical implementation', benefits:'30% faster line setup; fewer costly errors; optimized robot choreography', keyAiTasks:'Physics simulation, reinforcement learning for robot paths, multi-agent coordination', adopters:['BMW Group', 'General Motors', 'Hyundai-Kia'], value:5, complexity:4, techStack:['NVIDIA Omniverse', 'Isaac Sim', 'PhysX', 'ROS 2 integration'], example:'BMW replicates entire Spartanburg plant in Omniverse; tests new X5 line layout saving 3 months vs physical trial' },
  { id:'MF04', title:'O-Beya AI Engineering Agents', domain:'Manufacturing', agenticLevel:4, description:'Toyota multi-agent system where specialized AI agents collaborate on engineering tasks — one writes code, another reviews for safety standards, a third explains reasoning.', challenge:'Engineering knowledge is siloed across 300k+ employees; slow cross-functional coordination', solution:'GPT-4o powered multi-agent system mimics Toyota O-Beya room: agents collaborate, debate, and synthesize', benefits:'Faster engineering decisions, preserved institutional knowledge, cross-domain insights', keyAiTasks:'Multi-agent orchestration, code generation, safety reasoning', adopters:['Toyota'], value:5, complexity:5, techStack:['Azure OpenAI GPT-4o', 'AutoGen (Microsoft)', 'Azure Cosmos DB', 'Azure Functions'], example:'Three AI agents debate optimal weld parameters for new Corolla frame — one optimizes strength, another minimizes weight, third checks safety compliance' },
  { id:'MF05', title:'Factory Cloud DPP (AWS)', domain:'Manufacturing', agenticLevel:3, description:'VW Digital Production Platform on AWS connects 43 factories, standardizing data pipelines and deploying 1,200+ AI applications for quality, throughput, and energy management.', challenge:'Inconsistent factory systems prevent scaling AI across 120+ global plants', solution:'Unified cloud platform (AWS) provides common data layer and AI deployment pipeline for all plants', benefits:'Double-digit million EUR annual savings; standardized AI deployment at scale', keyAiTasks:'Data pipeline orchestration, model deployment, cross-plant analytics', adopters:['Volkswagen Group'], value:5, complexity:4, techStack:['Amazon Web Services', 'AWS SageMaker', 'AWS IoT Greengrass', 'Siemens integration'], example:'VW deploys quality prediction model from Wolfsburg to Chattanooga in 2 weeks instead of 6 months' },
  // Customer Experience
  { id:'CX01', title:'Gemini MBUX AI Agent', domain:'Customer', agenticLevel:3, description:'Google Gemini powers conversational navigation inside Mercedes CLA. Multi-turn dialogue with contextual awareness for POI search, route planning, and vehicle commands.', challenge:'In-car voice assistants lack contextual understanding and fail on complex multi-turn requests', solution:'Google Gemini + Vertex AI provides human-like conversation with full vehicle and map context', benefits:'Natural conversations, contextual POI discovery, reduced driver distraction', keyAiTasks:'Multi-turn NLU, API orchestration, contextual search, entity extraction', adopters:['Mercedes-Benz'], value:5, complexity:4, techStack:['Google Gemini', 'Google Cloud Automotive Agent', 'Google Maps Platform', 'Vertex AI'], example:'Driver says "Find Italian restaurants near my hotel that are open late and have outdoor seating" — Gemini handles the full query' },
  { id:'CX02', title:'Amazon Alexa+ In-Vehicle', domain:'Customer', agenticLevel:3, description:'BMW Neue Klasse integrates Amazon Alexa+ as global voice assistant (2026+), enabling smart home control, commerce, and multi-modal interaction from the vehicle.', challenge:'In-car assistants are disconnected from broader digital life ecosystem', solution:'Alexa+ provides continuity between home, mobile, and vehicle experiences with proactive intelligence', benefits:'Seamless ecosystem integration; commerce from the car; smart home pre-conditioning', keyAiTasks:'Multi-modal NLU, proactive inference, device orchestration, commerce API calls', adopters:['BMW Group'], value:4, complexity:3, techStack:['Amazon Alexa+', 'AWS Lambda', 'BMW Connected Drive SDK', 'Alexa Skills Kit'], example:'BMW driver says "Alexa, I\'m heading home" — Alexa adjusts home thermostat, starts playlist, and suggests optimal route' },
  { id:'CX03', title:'ChatGPT In-Vehicle Voice', domain:'Customer', agenticLevel:2, description:'OpenAI ChatGPT integrated into vehicle infotainment for natural language commands, search, route planning, and general knowledge queries.', challenge:'Traditional voice command systems require specific phrases and fail on ambiguous requests', solution:'ChatGPT API integration with vehicle context provides flexible, human-like voice interaction', benefits:'Dramatically improved user satisfaction; fewer misunderstood commands; richer interactions', keyAiTasks:'Natural language understanding, intent classification, API tool use', adopters:['Volkswagen Group'], value:4, complexity:2, techStack:['OpenAI ChatGPT API', 'VW IDA infotainment layer', 'CAN bus context injection'], example:'Driver says "I need fuel and coffee" — ChatGPT finds nearest combined fuel+coffee stop along route' },
  { id:'CX04', title:'Alibaba Qwen LLM In-Car (China)', domain:'Customer', agenticLevel:3, description:'BMW Neue Klasse China-spec integrates Alibaba Qwen LLM via Banma JV. Three capabilities: human-like interaction, multi-agent coordination, digital ecosystem integration.', challenge:'Western AI models underperform in Chinese language, culture, and digital ecosystem context', solution:'Qwen LLM with Yan AI cockpit layer specifically tuned for Chinese user preferences and services', benefits:'Superior Chinese NLP; integration with Alipay/Taobao ecosystem; multi-agent vehicle control', keyAiTasks:'Chinese NLP, agentic tool use, digital ecosystem API calls', adopters:['BMW Group'], value:4, complexity:3, techStack:['Alibaba Qwen LLM', 'Yan AI (Banma)', 'SAIC/Alibaba cloud', 'BMW IPA SDK'], example:'BMW iX3 driver (China) says "Book a lunch for 3 at a Michelin restaurant near my 2pm meeting" — handled end-to-end' },
  { id:'CX05', title:'Predictive Battery Management AI', domain:'Customer', agenticLevel:2, description:'AI models optimise battery temperature before reaching charging station, extending range and reducing degradation.', challenge:'Battery performance degrades from suboptimal thermal management and charging patterns', solution:'ML models analyze driving route, weather, and usage patterns to pre-condition battery optimally', benefits:'Up to 15% range increase; longer battery life; optimised charging time', keyAiTasks:'Time-series prediction, route optimization, thermal modelling', adopters:['Tesla', 'Mercedes-Benz', 'BYD'], value:5, complexity:3, techStack:['Custom ML (Tesla)', 'Azure AI (Mercedes)', 'BYD AI Cloud', 'Telematics feeds'], example:'Tesla pre-heats battery to 25°C before arriving at Supercharger — charging begins at max rate immediately' },
  // Supply Chain
  { id:'SC01', title:'Supply Chain Disruption Agent', domain:'Supply Chain', agenticLevel:4, description:'Multi-agent system monitors global supply chain signals and autonomously reroutes, substitutes, or escalates to procurement teams.', challenge:'Supply chain disruptions cause billion-dollar production stops', solution:'AI agents continuously monitor risk signals, trigger mitigation workflows, and negotiate alternatives', benefits:'50-70% reduction in response time to disruptions; lower buffer stock costs', keyAiTasks:'Risk scoring, multi-agent negotiation, workflow automation, NLP news monitoring', adopters:['Toyota', 'Volkswagen Group', 'BMW Group'], value:5, complexity:5, techStack:['AWS Supply Chain', 'Azure Supply Chain Insights', 'Custom agent frameworks'], example:'Toyota agent detects Tier-2 semiconductor shortage 6 weeks early and triggers alternative supplier qualification automatically' },
  { id:'SC02', title:'AI Demand Forecasting', domain:'Supply Chain', agenticLevel:2, description:'ML models integrate market signals, order books, macro data, and historical patterns to produce rolling production demand forecasts.', challenge:'Poor demand forecasts lead to over/under-production, excess inventory or lost sales', solution:'Gradient boosting and neural forecasting models retrained weekly on multi-source data', benefits:'20-30% forecast accuracy improvement; inventory reduction; better supplier commitments', keyAiTasks:'Time-series forecasting, feature engineering, confidence calibration', adopters:['Toyota', 'BMW Group', 'Ford Motor Co.', 'General Motors'], value:5, complexity:3, techStack:['AWS Forecast', 'Azure ML', 'Databricks', 'SAP IBP AI'], example:'BMW reduces raw material buffer stock by 18% after AI forecast accuracy improves from 72% to 91%' },
  { id:'SC03', title:'Cross-Border Trade Compliance Agent', domain:'Supply Chain', agenticLevel:3, description:'Agentic AI monitors regulatory changes across 50+ markets and automatically updates compliance documentation.', challenge:'Complex, ever-changing trade rules cause costly delays and fines', solution:'AI agent continuously monitors regulatory feeds, updates document templates, and flags human-review needs', benefits:'Near-zero compliance fines; 60% reduction in customs processing time', keyAiTasks:'Document generation, rule matching, workflow integration, regulatory NLP', adopters:['Volkswagen Group', 'Mercedes-Benz', 'Toyota'], value:4, complexity:4, techStack:['Azure AI Document Intelligence', 'Custom regulatory NLP', 'SAP GTS integration'], example:'Agent detects new EU carbon border tax applies to a Chinese component shipment and updates 200 forms overnight' },
  // Software Dev
  { id:'SD01', title:'MISRA Code Auto-Correction', domain:'Software', agenticLevel:4, description:'Woven by Toyota multi-agent system achieves 81.5% auto-correction rate on MISRA safety-standard C code violations.', challenge:'MISRA compliance errors in safety-critical embedded code slow certification and increase risk', solution:'Multi-agent system: one agent corrects, another evaluates, third explains reasoning', benefits:'81.5% auto-correction (from 50% single-agent); 97.1% code generation success', keyAiTasks:'Code generation, multi-agent evaluation, safety standard constraint solving', adopters:['Toyota'], value:5, complexity:4, techStack:['Azure OpenAI o3-mini', 'GPT-4o', 'AutoGen (Microsoft)', 'GitHub Enterprise', 'Azure App Service'], example:'Agent corrects 8 out of 10 MISRA violations in Toyota autonomous stack C code, with reasoning logged for audit' },
  { id:'SD02', title:'Generative AI Code Assistant', domain:'Software', agenticLevel:2, description:'GitHub Copilot and similar LLM tools integrated into OEM development workflows for embedded systems, ADAS code, and infotainment.', challenge:'Automotive software complexity is growing exponentially', solution:'LLM code completion, test generation, and documentation for embedded C/C++, Python, AUTOSAR', benefits:'40% coding productivity improvement; faster compliance documentation; better test coverage', keyAiTasks:'Code completion, test generation, documentation synthesis, AUTOSAR compliance checks', adopters:['BMW Group', 'Volkswagen Group', 'Ford Motor Co.', 'Mercedes-Benz'], value:5, complexity:2, techStack:['GitHub Copilot', 'Azure OpenAI Codex', 'OpenAI GPT-4o', 'AUTOSAR toolchain integration'], example:'BMW engineer generates AUTOSAR service interface stubs and unit tests in 10 minutes instead of 3 hours' },
  { id:'SD03', title:'SDV OTA Update AI Orchestrator', domain:'Software', agenticLevel:3, description:'AI agent manages phased software-defined vehicle OTA update rollouts: monitors telemetry, stages rollouts by cohort, rolls back on anomaly detection.', challenge:'Mass OTA failures can disable millions of vehicles and create safety risks', solution:'AI monitors rollout health metrics in real-time and autonomously gates or rolls back updates', benefits:'Zero major OTA failures; 5x faster rollout cycles; reduced warranty exposure', keyAiTasks:'Anomaly detection, cohort management, automated rollback decisions', adopters:['Tesla', 'BMW Group', 'Volkswagen Group'], value:5, complexity:4, techStack:['Uptane OTA framework', 'Custom anomaly detection', 'Kafka event streaming', 'AWS IoT'], example:'Tesla detects 0.3% increase in regen braking complaints in new cohort and pauses FSD V14 rollout automatically' },
  // Sustainability
  { id:'SU01', title:'AI Energy Optimisation (Factory)', domain:'Sustainability', agenticLevel:2, description:'ML models optimise factory energy consumption by predicting load curves and scheduling heavy equipment during off-peak tariffs.', challenge:'Automotive factories are among the most energy-intensive industrial facilities globally', solution:'Real-time energy management AI reduces consumption 8-15% with no production impact', benefits:'8-15% energy cost reduction; carbon footprint reduction; ESG compliance', keyAiTasks:'Load forecasting, schedule optimization, anomaly detection on energy anomalies', adopters:['BMW Group', 'Toyota', 'Volkswagen Group'], value:4, complexity:2, techStack:['AWS IoT Greengrass', 'Azure IoT Hub', 'Siemens Energy Manager AI'], example:'BMW Plant Munich reduces energy spend by €2M/year by shifting robot painting to overnight off-peak tariff windows' },
  { id:'SU02', title:'ESG Data Collection Agents', domain:'Sustainability', agenticLevel:4, description:'Multi-agent system automatically collects, validates, and consolidates ESG data across global supplier networks.', challenge:'ESG reporting requires data from thousands of suppliers', solution:'Agents query supplier portals, clean data, flag anomalies, and produce audit-ready reports', benefits:'80% reduction in ESG reporting time; audit-ready outputs; improved supplier compliance', keyAiTasks:'Data extraction, anomaly detection, report generation, multi-source fusion', adopters:['BMW Group', 'Mercedes-Benz', 'Toyota'], value:4, complexity:4, techStack:['Azure AI Document Intelligence', 'Custom agent orchestration', 'Power BI AI', 'SAP Sustainability'], example:'BMW ESG agent collects Scope 3 data from 12,000 suppliers in 4 weeks instead of 9 months' },
  // R&D
  { id:'RD01', title:'AI Vehicle Design Generative Tool', domain:'R&D', agenticLevel:2, description:'Generative AI tools produce aerodynamic body designs, interior layouts, and material configurations from engineer constraints.', challenge:'Traditional CAD design iteration cycles take 6-18 months for a new model', solution:'Generative design AI explores thousands of design variants simultaneously', benefits:'70% reduction in design iteration time; better aerodynamic outcomes; material savings', keyAiTasks:'Generative design, topology optimization, multi-objective constraint solving', adopters:['BMW Group', 'Mercedes-Benz', 'Ford Motor Co.'], value:5, complexity:3, techStack:['Ansys AI', 'Siemens NX AI (Azure)', 'Autodesk Generative Design', 'NVIDIA Modulus'], example:'BMW generates 800 door panel variants optimised for weight, crash, and NVH in 48 hours instead of 6 months' },
  { id:'RD02', title:'AI Battery Simulation (EV R&D)', domain:'R&D', agenticLevel:2, description:'ML models predict battery cell performance, degradation curves, and thermal behaviour across thousands of chemistry variants.', challenge:'EV battery R&D requires millions of cell tests costing years and billions in physical lab tests', solution:'AI surrogate models trained on electrochemical data predict cell performance with 95%+ accuracy', benefits:'90% reduction in physical cell test cycles; faster chemistry iteration; lower R&D cost', keyAiTasks:'Physics-informed neural nets, surrogate modelling, multi-scale simulation', adopters:['Tesla', 'BMW Group', 'Mercedes-Benz', 'BYD'], value:5, complexity:4, techStack:['Custom physics-ML (Tesla)', 'Gammatron predictive models', 'COMSOL AI', 'Azure ML'], example:'Mercedes AI predicts new solid-state cell degradation at year-10 without building a single physical prototype' },
  { id:'RD03', title:'Crash Simulation AI Acceleration', domain:'R&D', agenticLevel:2, description:'AI surrogate models reduce full FEA crash simulation time from days to minutes.', challenge:'High-fidelity crash simulations take 48-96 hours each; safety engineers need thousands per model cycle', solution:'Neural network surrogate models trained on past FEA runs predict crash outcomes in minutes', benefits:'95% reduction in simulation time; more thorough safety coverage; faster time-to-market', keyAiTasks:'Surrogate modelling, FEA result prediction, uncertainty quantification', adopters:['BMW Group', 'Mercedes-Benz', 'Toyota', 'Ford Motor Co.'], value:5, complexity:4, techStack:['Ansys AI (Azure)', 'LSTC LS-DYNA + ML', 'NVIDIA Modulus', 'Custom FEA surrogates'], example:'Toyota cuts crash simulation from 3 days to 12 minutes for each of 4,000 structural variants in new Corolla Cross platform' },
  { id:'RD04', title:'Autonomous Driving Simulation Stack', domain:'R&D', agenticLevel:3, description:'Cloud-scale simulation infrastructure combining physics engines, generative AI world models, and real-fleet data replay.', challenge:'Testing autonomous systems in the real world is insufficient, dangerous, and too slow', solution:'Multi-petabyte simulation infrastructure replays real trips, generates edge cases, and validates AI decisions at scale', benefits:'10x faster AV validation; coverage of trillion-mile edge case library', keyAiTasks:'Scenario generation, AV policy evaluation, safety metric tracking', adopters:['Tesla', 'General Motors', 'Mercedes-Benz'], value:5, complexity:5, techStack:['NVIDIA Cosmos', 'Custom simulation (Tesla)', 'AWS SageMaker', 'Waymo Open Dataset tools'], example:'Tesla validates FSD policy changes against 500M simulated miles overnight before any customer deployment' },
];

export interface DashboardContent {
  overviewTitle: string;
  overviewSubtitle: string;
  heroEyebrow: string;
  heroTitle: string;
  heroCopy: string;
  heroStat1: string;
  heroStat2: string;
  heroStat3: string;
}

export const DEFAULT_DASHBOARD_CONTENT: DashboardContent = {
  overviewTitle: 'Automotive AI maturity at a glance',
  overviewSubtitle: 'We compare 10 major OEMs across six capability dimensions to show where AI is creating operational and customer value.',
  heroEyebrow: 'Guiding Greatness',
  heroTitle: 'We help leaders navigate automotive AI complexity.',
  heroCopy: 'This dashboard brings strategy, maturity, use cases, and ecosystem signals into one NTT DATA view so teams can assess where the market is moving and where action matters next.',
  heroStat1: '2025-2026 market scan',
  heroStat2: '10 OEMs assessed',
  heroStat3: '35 use cases mapped',
};
