interface BookingPageProps {
  params: Promise<{ slug: string }>;
}

export default async function PublicBookingPage({ params }: BookingPageProps) {
  const { slug } = await params;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-bold">Book a Session</h1>
        <p className="text-muted-foreground">Trainer: {slug}</p>
        {/* Public booking form — Phase 1, Feature 5 */}
      </div>
    </div>
  );
}
