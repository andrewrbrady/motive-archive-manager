export default function CuratorSection() {
  return (
    <section className="min-h-screen flex">
      <div className="flex-1 flex items-center">
        <div className="max-w-xl mx-auto px-8">
          <p className="text-4xl font-bold leading-tight">
            Just as any museum has a curatorial team to photograph, document,
            archive and catalogue the works they have—
            <span className="block mt-4">
              it is vital for the modern collector to do the same.
            </span>
          </p>
        </div>
      </div>
      <div className="w-1/2 relative hidden md:block">
        <img
          src="https://imagedelivery.net/veo1agD2ekS5yYAVWyZXBA/4dbb830b-9fdf-4682-5d27-6c0f33cc1a00/public"
          alt="Ferrari Detail Shot"
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>

      {/* Mobile image - shown below text on smaller screens */}
      <div className="md:hidden w-full mt-8">
        <img
          src="https://imagedelivery.net/veo1agD2ekS5yYAVWyZXBA/4dbb830b-9fdf-4682-5d27-6c0f33cc1a00/public"
          alt="Ferrari Detail Shot"
          className="w-full"
        />
      </div>
    </section>
  );
}
