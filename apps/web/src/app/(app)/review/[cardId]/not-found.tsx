import Link from "next/link";

import { Container } from "@/components/app/container";
import { NotFoundState } from "@/components/app/error-state";
import { AppPageHeader } from "@/components/app/page-header";
import { buttonVariants } from "@/components/ui/button";

export default function CardNotFound() {
  return (
    <Container>
      <AppPageHeader title="Explain it back" />
      <NotFoundState
        noun="Card"
        action={
          <Link href="/review" className={buttonVariants({ variant: "secondary" })}>
            Back to the queue
          </Link>
        }
      />
    </Container>
  );
}
