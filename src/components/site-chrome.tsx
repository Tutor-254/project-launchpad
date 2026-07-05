import { Link, useNavigate } from "@tanstack/react-router";
import { Search, GraduationCap, Heart, Award, BookOpen, Clock, XCircle } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useInstructorOnboarding } from "@/hooks/use-instructor-onboarding";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { NotificationsBell } from "@/components/notifications-bell";

export function SiteHeader() {
  const { user } = useAuth();
  const {
    loading: onboardingLoading,
    isInstructor,
    isAdmin,
    phase,
    teachCta,
    hasPendingApplication,
  } = useInstructorOnboarding();
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate({ to: "/courses", search: { q } });
  }

  const teachLinkClass =
    phase === "pending"
      ? "hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-amber-600 hover:text-amber-700"
      : phase === "rejected-cooldown" || phase === "rejected-eligible"
        ? "hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-brand"
        : "text-sm font-medium text-muted-foreground hover:text-brand hidden sm:inline";

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="size-8 bg-brand rounded-lg flex items-center justify-center text-brand-foreground font-serif font-semibold">
            A
          </div>
          <span className="font-serif text-xl font-semibold tracking-tight">Arcane</span>
        </Link>

        <form onSubmit={submitSearch} className="flex-1 max-w-xl relative hidden md:block">
          <Search className="absolute inset-y-0 left-3 my-auto size-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search for advanced skills..."
            className="w-full bg-secondary border-none ring-1 ring-black/5 rounded-full py-2 pl-10 pr-4 text-sm focus:ring-brand focus:bg-card transition-all outline-none"
          />
        </form>

        <div className="flex items-center gap-3 shrink-0">
          {user ? (
            <>
              {/* Students (non-instructors without pending application) */}
              {!isInstructor && !hasPendingApplication && phase !== "rejected-cooldown" && phase !== "rejected-eligible" && (
                <>
                  <Link to="/teach" className="text-sm font-medium text-muted-foreground hover:text-brand hidden sm:inline">
                    Teach
                  </Link>
                  <Link to="/learn">
                    <Button className="bg-brand text-brand-foreground hover:bg-brand/90 rounded-lg">My Learning</Button>
                  </Link>
                </>
              )}

              {/* Pending instructor application */}
              {hasPendingApplication && (
                <>
                  <Link to={teachCta.to} search={teachCta.search} className={teachLinkClass}>
                    <Clock className="size-3.5" />
                    {teachCta.label}
                  </Link>
                  <Link to="/learn">
                    <Button className="bg-brand text-brand-foreground hover:bg-brand/90 rounded-lg">My Learning</Button>
                  </Link>
                </>
              )}

              {/* Rejected - cooldown or eligible */}
              {phase === "rejected-cooldown" || phase === "rejected-eligible" && (
                <>
                  <Link to={teachCta.to} search={teachCta.search} className={teachLinkClass}>
                    {phase === "rejected-eligible" ? (
                      <BookOpen className="size-3.5" />
                    ) : (
                      <XCircle className="size-3.5" />
                    )}
                    {teachCta.label}
                  </Link>
                  <Link to="/learn">
                    <Button className="bg-brand text-brand-foreground hover:bg-brand/90 rounded-lg">My Learning</Button>
                  </Link>
                </>
              )}

              {/* Instructors */}
              {isInstructor && (
                <>
                  <Link to="/learn" className="text-sm font-medium text-muted-foreground hover:text-brand hidden sm:inline">
                    My Learning
                  </Link>
                  <Link to="/instructor">
                    <Button className="bg-brand text-brand-foreground hover:bg-brand/90 rounded-lg">Studio</Button>
                  </Link>
                </>
              )}
              <NotificationsBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="rounded-full outline-none">
                    <Avatar className="size-9">
                      <AvatarFallback className="bg-brand/10 text-brand text-sm font-medium">
                        {(user.email ?? "?").slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  {/* Shared items for all users */}
                  <DropdownMenuItem asChild><Link to="/learn"><GraduationCap className="mr-2 size-4" />My Learning</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/wishlist"><Heart className="mr-2 size-4" />Wishlist</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/certificates"><Award className="mr-2 size-4" />Certificates</Link></DropdownMenuItem>

                  {/* Instructor-specific items */}
                  {isInstructor && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild><Link to="/instructor"><BookOpen className="mr-2 size-4" />Studio</Link></DropdownMenuItem>
                      <DropdownMenuItem asChild><Link to="/instructor/analytics">Analytics</Link></DropdownMenuItem>
                      <DropdownMenuItem asChild><Link to="/instructor/payouts">Payouts</Link></DropdownMenuItem>
                    </>
                  )}

                  {/* Pending/Rejected application CTA */}
                  {!onboardingLoading && !isInstructor && (hasPendingApplication || phase === "rejected-cooldown" || phase === "rejected-eligible") && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link
                          to={teachCta.to}
                          search={teachCta.search}
                          className={
                            phase === "pending"
                              ? "text-amber-600"
                              : phase === "rejected-cooldown"
                                ? "text-muted-foreground"
                                : undefined
                          }
                        >
                          {phase === "pending" ? (
                            <Clock className="mr-2 size-4" />
                          ) : (
                            <BookOpen className="mr-2 size-4" />
                          )}
                          {teachCta.label}
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}

                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild><Link to="/settings/profile">Profile settings</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/settings/orders">My orders</Link></DropdownMenuItem>
                  {isAdmin && <DropdownMenuItem asChild><Link to="/admin">Admin console</Link></DropdownMenuItem>}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>Sign out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link to="/teach" className="text-sm font-medium text-muted-foreground hover:text-brand hidden sm:inline">
                Teach
              </Link>
              <Link to="/auth"><Button variant="ghost">Sign in</Button></Link>
              <Link to="/auth" search={{ mode: "signup" }}>
                <Button className="bg-brand text-brand-foreground hover:bg-brand/90 rounded-lg">Get started</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export function SiteFooter() {
  const { user } = useAuth();
  const { isInstructor, teachCta, hasPendingApplication, phase } = useInstructorOnboarding();

  return (
    <footer className="border-t border-border bg-secondary/40 mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-2 gap-8 md:grid-cols-4">
        <div className="col-span-2 md:col-span-1 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="size-6 bg-brand rounded flex items-center justify-center text-brand-foreground font-serif text-xs">A</div>
            <span className="font-serif text-lg font-semibold">Arcane</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-[24ch]">
            Where working experts teach the fundamental and the fringe.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Learn</span>
          <Link to="/courses" className="text-xs text-foreground/80 hover:text-brand transition-colors">Browse Courses</Link>
          <Link to="/learn" className="text-xs text-foreground/80 hover:text-brand transition-colors">My Learning</Link>
          <Link to="/certificates" className="text-xs text-foreground/80 hover:text-brand transition-colors">Certificates</Link>
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Teach</span>
          {isInstructor ? (
            <>
              <Link to="/instructor" className="text-xs text-foreground/80 hover:text-brand transition-colors">Studio</Link>
              <Link to="/instructor/analytics" className="text-xs text-foreground/80 hover:text-brand transition-colors">Analytics</Link>
              <Link to="/instructor/payouts" className="text-xs text-foreground/80 hover:text-brand transition-colors">Payouts</Link>
            </>
          ) : user ? (
            hasPendingApplication || phase === "rejected-cooldown" || phase === "rejected-eligible" ? (
              <Link
                to={teachCta.to}
                search={teachCta.search}
                className="text-xs text-foreground/80 hover:text-brand transition-colors"
              >
                {teachCta.label}
              </Link>
            ) : (
              <>
                <Link to="/teach" className="text-xs text-foreground/80 hover:text-brand transition-colors">Why teach on Arcane</Link>
                <Link
                  to={teachCta.to}
                  search={teachCta.search}
                  className="text-xs text-foreground/80 hover:text-brand transition-colors"
                >
                  {teachCta.label}
                </Link>
              </>
            )
          ) : (
            <>
              <Link to="/teach" className="text-xs text-foreground/80 hover:text-brand transition-colors">Become an Instructor</Link>
              <Link to="/auth" search={{ mode: "signup", intent: "teach" }} className="text-xs text-foreground/80 hover:text-brand transition-colors">
                Apply to teach
              </Link>
            </>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Legal</span>
          <a href="#" className="text-xs text-foreground/80 hover:text-brand transition-colors">Privacy Policy</a>
          <a href="#" className="text-xs text-foreground/80 hover:text-brand transition-colors">Terms of Service</a>
        </div>
      </div>

      <div className="border-t border-border/60">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground">
            © {new Date().getFullYear()} Arcane. All rights reserved.
          </p>
          <p className="text-[11px] text-muted-foreground">
            Built for learners who go deeper.
          </p>
        </div>
      </div>
    </footer>
  );
}
