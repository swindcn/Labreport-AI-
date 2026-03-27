import { PhoneFrame } from "@/components/mobile/PhoneFrame";
import { Chip } from "@/components/ui/Chip";
import { MetricCard } from "@/components/ui/MetricCard";
import { SectionCard } from "@/components/ui/SectionCard";
import {
  ActionTile,
  AvatarBadge,
  BottomTabs,
  BrandHeader,
  Card,
  CircleIcon,
  InsightCard,
  Label,
  RouteButton,
  SegmentedControl,
  SocialButton,
  TextAreaInput,
  TextInput,
  ThumbTile,
  TopBar,
} from "@/components/health/primitives";
import {
  BiomarkerTrendCardList,
  FamilyProfilesStrip,
  HealthCategoryList,
  ManualBiomarkerFields,
  MonthlyTrendList,
  ProfileMenuSections,
  RecentRecordsSection,
  ReportBiomarkerSections,
} from "@/components/health/sections";
import {
  manualBiomarkers,
  profileMenu,
} from "@/lib/healthData";
import { useHealthStore } from "@/lib/healthStore";
import { RouteLink, type RouteConfig } from "@/lib/hashRouter";

const inAppTabs = [
  { label: "HOME", to: "/dashboard" },
  { label: "TRENDS", to: "/trends" },
  { label: "PROFILE", to: "/profile" },
];

function ScreensIndexPage() {
  const { state, derived } = useHealthStore();
  const routes = screenRoutes.filter((route) => route.path !== "/screens");

  return (
    <div className="flex flex-col gap-6">
      <SectionCard
        eyebrow="Routing"
        title="Vitalis Core Mobile Routes"
        description="11 个屏幕已经拆成真实 hash 路由页面。默认入口是这个索引页，每张卡片都能跳到对应页面。"
        aside={<Chip label={`${routes.length} Routes`} tone="accent" />}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCard label="当前档案" value={derived.currentProfile.name} detail={derived.currentProfile.memberId} />
          <MetricCard label="报告数量" value={`${state.reports.length}`} detail="全局 store 实时驱动" />
          <MetricCard label="路由方式" value="Hash Router" detail="无额外依赖，当前环境可直接工作" />
        </div>
      </SectionCard>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {routes.map((route) => (
          <RouteLink key={route.path} to={route.path} className="block">
            <div className="rounded-[1.75rem] border border-[#dbe4fb] bg-white px-5 py-5 shadow-[0_18px_44px_rgba(135,149,198,0.10)] transition-transform hover:-translate-y-0.5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#1E40AF]">{route.path}</p>
                  <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-900">
                    {route.title}
                  </h3>
                  {route.description ? (
                    <p className="mt-3 text-sm leading-6 text-slate-500">{route.description}</p>
                  ) : null}
                </div>
                <div className="rounded-full bg-[#dbe7ff] px-3 py-1 text-sm font-semibold text-[#1E40AF]">
                  Open
                </div>
              </div>
            </div>
          </RouteLink>
        ))}
      </div>
    </div>
  );
}

function HomePage() {
  const { actions } = useHealthStore();

  return (
    <PhoneFrame header={<TopBar left="≡" title="Health Analysis" right={<AvatarBadge label="DR" />} />}>
      <div className="px-1">
        <h2 className="max-w-[10ch] text-[3rem] font-semibold leading-[0.95] tracking-[-0.04em] text-slate-900">
          Secure Document Intelligence
        </h2>
        <p className="mt-4 text-[1.2rem] leading-8 text-slate-500">
          Transform your medical paperwork into actionable health insights using our clinical-grade AI scanner.
        </p>
      </div>

      <Card>
        <Label>EXAMINATION TYPE</Label>
        <SegmentedControl items={["Routine", "Clinical"]} active="Routine" />
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <ActionTile label="Camera" icon="CA" />
        <ActionTile label="Gallery" icon="GA" />
        <ActionTile label="Files" icon="FI" />
      </div>

      <section>
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[1.05rem] font-semibold text-slate-900">Recent Selections</h3>
          <Chip label="LAST 24 HOURS" tone="accent" />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <ThumbTile tone="dark" />
          <ThumbTile tone="blue" />
          <ThumbTile tone="empty" />
        </div>
      </section>

      <div className="flex items-center gap-3 rounded-[1.4rem] bg-white px-4 py-3 shadow-[0_14px_28px_rgba(135,149,198,0.10)]">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e7fff0] text-xs font-semibold text-[#25b961]">
          SH
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">Encryption Active</p>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">256-bit secure</p>
        </div>
      </div>

      <RouteButton to="/scanning" onClick={actions.startScan}>
        Start Analysis
      </RouteButton>
      <RouteLink to="/screens" className="text-center text-[11px] uppercase tracking-[0.18em] text-slate-400">
        HIPAA-compliant clinical data processing.
      </RouteLink>
    </PhoneFrame>
  );
}

function DashboardPage() {
  const { derived, actions } = useHealthStore();

  return (
    <PhoneFrame header={<TopBar left="≡" title="Vitalis Core" right={<AvatarBadge label="ME" />} />}>
      <div className="px-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7d859a]">
          Smart Health Insights
        </p>
      </div>

      <FamilyProfilesStrip
        profiles={derived.familyProfileItems}
        activeId={derived.currentProfile.id}
        actionLabel="+ Add Member"
        onSelect={actions.selectProfile}
      />

      <div className="rounded-[1.9rem] bg-[linear-gradient(135deg,_#1E40AF,_#3156D3)] px-5 py-5 text-white shadow-[0_22px_50px_rgba(30,64,175,0.32)]">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-sm font-semibold">
          RP
        </div>
        <h3 className="mt-5 text-[1.9rem] font-semibold leading-tight tracking-[-0.03em]">
          Add Your Report
        </h3>
        <p className="mt-3 text-sm leading-6 text-white/80">
          Choose between instant AI scan or manual data entry for your results.
        </p>
        <RouteLink
          to="/scanning"
          onClick={actions.startScan}
          className="mt-5 flex w-full items-center justify-center rounded-[1.2rem] bg-white px-4 py-3 text-base font-semibold text-[#1E40AF]"
        >
          Analyze Now →
        </RouteLink>
        <RouteLink
          to="/manual-entry"
          className="mt-3 flex w-full items-center justify-center rounded-[1.2rem] border border-white/25 bg-white/8 px-4 py-3 text-base font-semibold text-white"
        >
          Manual Entry
        </RouteLink>
      </div>

      <RecentRecordsSection records={derived.recentRecordItems} viewAllTo="/trends" />

      <BottomTabs active="/dashboard" items={inAppTabs} />
    </PhoneFrame>
  );
}

function ScanningPage() {
  const { state, actions } = useHealthStore();

  return (
    <PhoneFrame
      header={<TopBar left={<RouteLink to="/dashboard">←</RouteLink>} title="Health Analysis" right={<AvatarBadge label="ID" dark />} centered />}
    >
      <div className="rounded-[2rem] bg-white px-5 py-6 shadow-[0_18px_50px_rgba(135,149,198,0.14)]">
        <div className="h-4 w-44 rounded-full bg-[#eef2fb]" />
        <div className="relative mt-6 overflow-hidden rounded-[1.4rem] bg-[#f8fbff] px-4 py-8">
          <div className="space-y-3">
            <div className="h-3 w-32 rounded-full bg-[#edf1fb]" />
            <div className="h-3 w-48 rounded-full bg-[#edf1fb]" />
            <div className="h-3 w-28 rounded-full bg-[#edf1fb]" />
          </div>
          <div className="pointer-events-none absolute inset-x-0 top-10 h-5 bg-[linear-gradient(90deg,_transparent,_rgba(108,255,173,0.45),_transparent)] blur-sm" />
          <div className="mt-12 grid grid-cols-2 gap-4">
            <div className="rounded-[1.2rem] bg-[#edf3ff] px-3 py-4">
              <Chip label="IDENTIFYING BIOMARKERS" tone="accent" />
            </div>
            <div className="rounded-[1.2rem] bg-[#f1fbf4] px-3 py-4">
              <Chip label="RESULTS EXTRACTION" tone="success" />
            </div>
          </div>
          <div className="mt-4 space-y-3">
            <div className="h-3 w-40 rounded-full bg-[#edf1fb]" />
            <div className="h-3 w-28 rounded-full bg-[#edf1fb]" />
          </div>
        </div>
      </div>

      <div className="px-2 pt-2 text-center">
        <h2 className="text-[2.2rem] font-semibold leading-[1.05] tracking-[-0.04em] text-slate-900">
          Extracting report content...
        </h2>
        <p className="mx-auto mt-4 max-w-[16rem] text-[1.2rem] leading-8 text-slate-500">
          Identifying biomarkers, results, and reference ranges.
        </p>
      </div>

      <div className="pt-2">
        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          <span>Analyzing Structure</span>
          <span>{state.scanSession.progress}%</span>
        </div>
        <div className="mt-3 h-2 rounded-full bg-[#e5e9f4]">
          <div className="h-2 rounded-full bg-[#1E40AF]" style={{ width: `${state.scanSession.progress}%` }} />
        </div>
      </div>

      <Card className="bg-[#f2f6ff]">
        <div className="flex gap-3">
          <CircleIcon label="i" tone="accent" />
          <p className="text-[1.05rem] leading-7 text-slate-500">
            You'll be able to review and correct the results once identification is complete.
          </p>
        </div>
      </Card>

      <RouteButton to="/report-analysis" onClick={actions.completeScan}>
        Continue to Analysis
      </RouteButton>
    </PhoneFrame>
  );
}

function ReportAnalysisPage() {
  const { derived } = useHealthStore();
  const selectedReport = derived.selectedReport;

  return (
    <PhoneFrame header={<TopBar left={<RouteLink to="/scanning">←</RouteLink>} title="Health Report" right="↗" />}>
      <div className="px-1">
        <Label>CLINICAL ANALYSIS</Label>
        <h2 className="mt-2 text-[2.5rem] font-semibold leading-[0.95] tracking-[-0.04em] text-slate-900">
          Health Report Analysis
        </h2>
      </div>

      <div className="grid grid-cols-[1.3fr_0.8fr] gap-3">
        <Card>
          <p className="text-sm text-slate-500">AI Scan Accuracy</p>
          <div className="mt-2 flex items-end gap-2">
            <span className="text-[2.2rem] font-semibold tracking-[-0.04em] text-[#1E40AF]">
              {selectedReport ? `${selectedReport.aiAccuracy.toFixed(1)}%` : "--"}
            </span>
            <span className="mb-1 text-sm font-semibold text-[#1aa35f]">Verified</span>
          </div>
        </Card>
        <Card className="bg-[#e9fff4]">
          <div className="flex h-full items-center justify-center text-[#1aa35f]">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-sm font-semibold">
              OK
            </div>
          </div>
        </Card>
      </div>

      <ReportBiomarkerSections groups={derived.reportBiomarkerGroups} />

      <section>
        <h3 className="px-1 text-[1.12rem] font-semibold text-slate-900">Actionable Insights</h3>
        <div className="mt-3 space-y-3">
          <InsightCard
            tone="accent"
            title="Doctor Consultation"
            detail="Based on your ALT levels, we recommend scheduling a follow-up with your GP this week."
          />
          <InsightCard
            tone="warning"
            title="Dietary Adjustment"
            detail="Increasing your leafy green intake may help stabilize your kidney biomarkers."
          />
        </div>
      </section>

      <RouteButton to="/trends">Save Results</RouteButton>
    </PhoneFrame>
  );
}

function ManualEntryPage() {
  const { state, actions } = useHealthStore();

  return (
    <PhoneFrame header={<TopBar left={<RouteLink to="/dashboard">←</RouteLink>} title="Manual Entry" right="⋮" />}>
      <div className="px-1">
        <Label>DATA MANAGEMENT</Label>
        <h2 className="mt-2 text-[2.3rem] font-semibold leading-[0.95] tracking-[-0.04em] text-slate-900">
          Batch Biomarker Recognition
        </h2>
        <p className="mt-3 text-[1.05rem] leading-7 text-slate-500">
          Ensure clinical precision by grouping inputs by physiological system. All values are validated against laboratory standards.
        </p>
      </div>

      <Card className="bg-[#f4f7ff]">
        <Label>TEST DATE</Label>
        <TextInput
          type="date"
          value={state.manualEntryDraft.date}
          onChange={(value) => actions.setManualMeta("date", value)}
          placeholder="Select date"
        />
        <div className="mt-4">
          <Label>EXAMINATION TYPE</Label>
          <SegmentedControl
            items={["Routine", "Clinical"]}
            active={state.manualEntryDraft.examType}
            onChange={(value) => actions.setManualMeta("examType", value)}
          />
        </div>
      </Card>

      <Card>
        <Label>SELECT LABORATORY PANEL</Label>
        <button
          type="button"
          className="mt-3 flex w-full items-center justify-between rounded-[1rem] border border-[#e2e8f6] bg-white px-4 py-4"
          onClick={() => actions.setManualMeta("panel", "Liver Function Panel")}
        >
          <div className="flex items-center gap-3">
            <CircleIcon label="LF" tone="accent" />
            <span className="font-semibold text-slate-900">{state.manualEntryDraft.panel}</span>
          </div>
          <span className="text-slate-400">﹀</span>
        </button>
      </Card>

      <Card className="bg-[#f4f7ff]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[1.45rem] font-semibold leading-none text-slate-900">
              {state.manualEntryDraft.panel}
            </p>
            <p className="mt-2 text-sm text-slate-500">6 biomarkers detected</p>
          </div>
          <Chip label="6 BIOMARKERS DETECTED" />
        </div>
        <ManualBiomarkerFields
          items={manualBiomarkers}
          values={state.manualEntryDraft.values}
          onChange={actions.setManualValue}
        />
      </Card>

      <RouteButton to="/report-analysis" onClick={actions.submitManualEntry}>
        Save &amp; Submit Results
      </RouteButton>
      <p className="text-center text-xs leading-5 text-slate-400">
        By submitting, you confirm that these values correspond to your official medical laboratory report.
      </p>
    </PhoneFrame>
  );
}

function TrendsPage() {
  const { derived, actions } = useHealthStore();

  return (
    <PhoneFrame header={<BrandHeader brand="Vitalis Core" />}>
      <FamilyProfilesStrip
        profiles={derived.familyProfileItems}
        compact
        activeId={derived.currentProfile.id}
        onSelect={actions.selectProfile}
      />

      <Card className="bg-[#f4f7ff]">
        <Label>EXAMINATION TYPE</Label>
        <SegmentedControl items={["Routine", "Clinical"]} active="Routine" />
      </Card>

      <section>
        <Label>HEALTH OVERVIEW</Label>
        <h2 className="mt-2 text-[2.2rem] font-semibold leading-[0.95] tracking-[-0.04em] text-slate-900">
          Health Trends by Category
        </h2>
        <HealthCategoryList items={derived.healthCategoryItems} />
      </section>

      <Card className="bg-[#eef4ff]">
        <h3 className="text-[1.6rem] font-semibold leading-[1.05] tracking-[-0.03em] text-slate-900">
          Comprehensive Health Archive
        </h3>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Access your full longitudinal health history. We track over 40 clinical biomarkers to provide a sanctuary of clarity in your wellness journey.
        </p>
        <RouteLink
          to="/biomarker-trends"
          className="mt-5 inline-flex rounded-[1rem] bg-[#1E40AF] px-4 py-3 text-sm font-semibold text-white"
        >
          View AI Interpreted Data
        </RouteLink>
      </Card>

      <Card>
        <h3 className="text-sm font-semibold text-slate-900">Monthly Trend Analysis</h3>
        <MonthlyTrendList items={derived.monthlyTrendItems} />
      </Card>

      <BottomTabs active="/trends" items={inAppTabs} />
    </PhoneFrame>
  );
}

function BiomarkerTrendsPage() {
  const { derived } = useHealthStore();

  return (
    <PhoneFrame header={<TopBar left={<RouteLink to="/trends">←</RouteLink>} title="Biomarker Trends" />}>
      <div className="px-1">
        <h2 className="text-[2.1rem] font-semibold leading-[1] tracking-[-0.04em] text-slate-900">
          Biomarker Trends
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          See longitudinal tracking of your core biochemical markers.
        </p>
      </div>

      <div className="flex gap-2 px-1">
        <Chip label="Optimal Range" tone="success" />
        <Chip label="Action Required" tone="danger" />
      </div>

      <BiomarkerTrendCardList items={derived.biomarkerTrendItems} />

      <Card className="bg-[#dfeaff]">
        <h3 className="text-[1.5rem] font-semibold leading-[1.05] tracking-[-0.03em] text-slate-900">
          Long-term Health Trajectory
        </h3>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {derived.currentProfile.name}'s tracked biomarkers are rendered from the shared app store. As more reports are added, this panel updates automatically from the same underlying measurement timeline.
        </p>
      </Card>
    </PhoneFrame>
  );
}

function ProfileRegistrationPage() {
  const { state, actions } = useHealthStore();

  return (
    <PhoneFrame header={<TopBar left={<RouteLink to="/register">←</RouteLink>} title="Health Profile" right="⋮" />}>
      <div className="flex flex-col items-center">
        <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-[#1E40AF] text-sm font-semibold text-white">
          USER
          <div className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-[#1E40AF] text-xs font-semibold">
            UP
          </div>
        </div>
        <button className="mt-4 text-base font-semibold uppercase tracking-[0.1em] text-[#1E40AF]">
          Upload Photo
        </button>
      </div>

      <div>
        <Label>FULL NAME</Label>
        <TextInput
          value={state.profileDraft.fullName}
          onChange={(value) => actions.setProfileDraftField("fullName", value)}
          placeholder="Full name"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>DATE OF BIRTH</Label>
          <TextInput
            type="date"
            value={state.profileDraft.birthDate}
            onChange={(value) => actions.setProfileDraftField("birthDate", value)}
            placeholder="mm/dd/yyyy"
          />
        </div>
        <div>
          <Label>GENDER IDENTITY</Label>
          <TextInput
            value={state.profileDraft.gender}
            onChange={(value) => actions.setProfileDraftField("gender", value)}
            placeholder="Select"
            trailing="﹀"
          />
        </div>
      </div>
      <div>
        <Label>DESCRIBE YOUR CURRENT CLINICAL BASELINE</Label>
        <TextAreaInput
          value={state.profileDraft.note}
          onChange={(value) => actions.setProfileDraftField("note", value)}
          placeholder="Note any chronic conditions, recurring symptoms, or recent medical observations..."
        />
      </div>

      <Card className="bg-[#f3f7ff]">
        <div className="flex gap-3">
          <CircleIcon label="SH" tone="accent" />
          <div>
            <p className="font-semibold text-slate-900">Privacy &amp; Compliance</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Your data is secured with clinical-grade encryption. All profile information is processed in accordance with HIPAA compliance standards to ensure your privacy is never compromised.
            </p>
          </div>
        </div>
      </Card>

      <RouteButton to="/dashboard" onClick={actions.saveProfile}>
        Save and Continue
      </RouteButton>
    </PhoneFrame>
  );
}

function RegisterPage() {
  const { state, actions } = useHealthStore();

  return (
    <PhoneFrame header={<BrandHeader brand="Vitalis Core" />} bodyClassName="px-3 pb-8">
      <div className="rounded-[2rem] bg-white px-6 py-7 shadow-[0_24px_60px_rgba(166,182,217,0.18)]">
        <h2 className="text-center text-[2.6rem] font-semibold leading-[0.95] tracking-[-0.04em] text-slate-900">
          Join Vitalis Core
        </h2>
        <p className="mx-auto mt-4 max-w-[15rem] text-center text-[1.05rem] leading-7 text-slate-500">
          Create your account to start tracking your health trends.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <SocialButton label="Google" />
          <SocialButton label="Apple" />
        </div>

        <div className="my-6 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
          <span className="h-px flex-1 bg-[#edf0f6]" />
          or email sign up
          <span className="h-px flex-1 bg-[#edf0f6]" />
        </div>

        <div>
          <Label>EMAIL ADDRESS</Label>
          <TextInput
            type="email"
            value={state.auth.registerDraft.email}
            onChange={(value) => actions.setRegisterField("email", value)}
            placeholder="jane.smith@medical.com"
          />
        </div>
        <div className="mt-4">
          <div>
            <Label>VERIFICATION CODE</Label>
            <TextInput
              value={state.auth.registerDraft.code}
              onChange={(value) => actions.setRegisterField("code", value)}
              placeholder="6-digit code"
              trailing={<span className="font-semibold text-[#1E40AF]">Send Code</span>}
            />
          </div>
        </div>
        <div className="mt-4">
          <div>
            <Label>SECURE PASSWORD</Label>
            <TextInput
              type="password"
              value={state.auth.registerDraft.password}
              onChange={(value) => actions.setRegisterField("password", value)}
              placeholder="••••••••••••"
              trailing="◌"
            />
          </div>
        </div>

        <div className="mt-5 flex gap-3 text-sm leading-6 text-slate-500">
          <div className="mt-1 h-4 w-4 rounded border border-[#dde2ee]" />
          <p>
            I acknowledge the <span className="font-semibold text-[#1E40AF]">Clinical Data Privacy Policy</span> and agree to the biometric processing for health monitoring.
          </p>
        </div>

        <RouteButton to="/profile-registration" className="mt-6" onClick={actions.register}>
          Join Vitalis →
        </RouteButton>
        <p className="mt-6 text-center text-base text-slate-500">
          Already a member?{" "}
          <RouteLink to="/login" className="font-semibold text-[#1E40AF]">
            Log In
          </RouteLink>
        </p>
      </div>
    </PhoneFrame>
  );
}

function LoginPage() {
  const { state, actions } = useHealthStore();

  return (
    <PhoneFrame header={<BrandHeader brand="Vitalis Core" />} bodyClassName="px-3 pb-6">
      <div className="rounded-[2rem] bg-white px-6 py-7 shadow-[0_24px_60px_rgba(166,182,217,0.18)]">
        <h2 className="text-[2.5rem] font-semibold leading-[0.95] tracking-[-0.04em] text-slate-900">
          Welcome Back
        </h2>
        <p className="mt-4 max-w-[15rem] text-[1.05rem] leading-7 text-slate-500">
          Please enter your credentials to access your secure health portal.
        </p>

        <div className="mt-6 space-y-4">
          <TextInput
            type="email"
            value={state.auth.loginDraft.email}
            onChange={(value) => actions.setLoginField("email", value)}
            placeholder="Email Address"
          />
          <TextInput
            type="password"
            value={state.auth.loginDraft.password}
            onChange={(value) => actions.setLoginField("password", value)}
            placeholder="Password"
            trailing="◌"
          />
        </div>
        <p className="mt-3 text-right text-sm font-semibold text-[#1E40AF]">Forgot Password?</p>

        <RouteButton to="/dashboard" className="mt-6" onClick={actions.login}>
          Login
        </RouteButton>

        <div className="my-6 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
          <span className="h-px flex-1 bg-[#edf0f6]" />
          or continue with
          <span className="h-px flex-1 bg-[#edf0f6]" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <SocialButton label="Google" />
          <SocialButton label="Apple" />
        </div>

        <p className="mt-7 text-center text-base text-slate-500">
          Don't have an account?{" "}
          <RouteLink to="/register" className="font-semibold text-[#1E40AF]">
            Create Profile
          </RouteLink>
        </p>
      </div>

      <div className="mt-auto space-y-5 px-3 pt-3">
        <div className="flex items-center justify-center gap-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          <span>eIPAA COMPLIANT</span>
          <span>256-BIT ENCRYPTED</span>
        </div>
        <div className="text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          <p>© 2024 Vitalis Core Healthcare Systems</p>
          <p className="mt-2">Privacy Policy Terms of Service Support</p>
        </div>
      </div>
    </PhoneFrame>
  );
}

function ProfilePage() {
  const { derived, actions } = useHealthStore();

  return (
    <PhoneFrame header={<TopBar left={<RouteLink to="/dashboard">←</RouteLink>} title="Profile" centered />}>
      <div className="flex flex-col items-center">
        <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-[#2d4458] text-lg font-semibold text-white ring-4 ring-[#56d5b6] ring-offset-4 ring-offset-[#f9f9ff]">
          {derived.currentProfile.initials}
          <div className="absolute -bottom-2 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-[#1E40AF] text-sm font-semibold text-white">
            ✓
          </div>
        </div>
        <h2 className="mt-6 text-[2rem] font-semibold tracking-[-0.04em] text-slate-900">
          {derived.currentProfile.name} ({derived.currentProfile.relation})
        </h2>
        <p className="mt-2 text-sm text-slate-500">Member ID: {derived.currentProfile.memberId}</p>
        <button className="mt-5 rounded-full bg-[#eef2fb] px-5 py-3 text-sm font-semibold text-[#1E40AF]">
          ← Profile Switcher
        </button>
      </div>

      <ProfileMenuSections groups={profileMenu} />

      <button
        type="button"
        onClick={actions.logout}
        className="rounded-[1.2rem] bg-[#f8ecef] px-4 py-4 text-base font-semibold text-[#f04444]"
      >
        Sign Out
      </button>
      <RouteLink to="/screens" className="text-center text-[11px] uppercase tracking-[0.18em] text-slate-400">
        eALTE AI v2.4.0 • Established 2024
      </RouteLink>
      <BottomTabs active="/profile" items={inAppTabs} />
    </PhoneFrame>
  );
}

function NotFoundPage() {
  return (
    <SectionCard
      eyebrow="404"
      title="Route Not Found"
      description="这个地址没有对应页面。你可以返回路由索引，或继续访问现有的 Vitalis Core 页面。"
      aside={<Chip label="Hash Router" tone="warning" />}
    >
      <div className="flex gap-3">
        <RouteButton to="/screens">Open Route Index</RouteButton>
        <RouteButton to="/dashboard" tone="secondary">
          Open Dashboard
        </RouteButton>
      </div>
    </SectionCard>
  );
}

export const screenRoutes: RouteConfig[] = [
  {
    path: "/screens",
    title: "Route Index",
    description: "查看全部页面入口",
    element: <ScreensIndexPage />,
  },
  {
    path: "/home",
    title: "Home Landing",
    description: "扫描入口首页",
    element: <HomePage />,
  },
  {
    path: "/dashboard",
    title: "Dashboard",
    description: "报告上传与家庭档案主页",
    element: <DashboardPage />,
  },
  {
    path: "/scanning",
    title: "Scanning",
    description: "报告识别中",
    element: <ScanningPage />,
  },
  {
    path: "/report-analysis",
    title: "Report Analysis",
    description: "AI 识别结果",
    element: <ReportAnalysisPage />,
  },
  {
    path: "/manual-entry",
    title: "Manual Entry",
    description: "手动添加指标",
    element: <ManualEntryPage />,
  },
  {
    path: "/trends",
    title: "Health Trends",
    description: "健康趋势分类页",
    element: <TrendsPage />,
  },
  {
    path: "/biomarker-trends",
    title: "Biomarker Trends",
    description: "生物标识物详情",
    element: <BiomarkerTrendsPage />,
  },
  {
    path: "/profile-registration",
    title: "Profile Registration",
    description: "患者信息登记",
    element: <ProfileRegistrationPage />,
  },
  {
    path: "/register",
    title: "Register",
    description: "注册页",
    element: <RegisterPage />,
  },
  {
    path: "/login",
    title: "Login",
    description: "登录页",
    element: <LoginPage />,
  },
  {
    path: "/profile",
    title: "Profile",
    description: "个人主页",
    element: <ProfilePage />,
  },
];

export function getRouteElement(path: string) {
  return screenRoutes.find((route) => route.path === path)?.element ?? <NotFoundPage />;
}
