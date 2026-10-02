import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

// One template for single-link auth emails (verify, reset). Styled after DESIGN.md: black, white, blue outline CTA.

type Props = {
  preview: string;
  title: string;
  body: string;
  cta: string;
  url: string;
  footnote: string;
};

export function ActionEmail({ preview, title, body, cta, url, footnote }: Props) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: "#000000",
          color: "#ffffff",
          fontFamily: "Helvetica, Arial, sans-serif",
        }}
      >
        <Container style={{ maxWidth: 480, padding: "40px 24px" }}>
          <Text style={{ fontSize: 20, fontWeight: 700, letterSpacing: "0.15em", margin: 0 }}>
            FLASHD
          </Text>
          <Heading
            as="h1"
            style={{
              fontSize: 18,
              letterSpacing: "0.17em",
              textTransform: "uppercase",
              marginTop: 32,
            }}
          >
            {title}
          </Heading>
          <Text style={{ fontSize: 14, lineHeight: "22px", color: "rgba(255,255,255,0.8)" }}>
            {body}
          </Text>
          <Section style={{ margin: "28px 0" }}>
            <Button
              href={url}
              style={{
                border: "1px solid #4B9CD3",
                borderRadius: 8,
                color: "#ffffff",
                padding: "14px 20px",
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
              }}
            >
              {cta}
            </Button>
          </Section>
          <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{footnote}</Text>
          <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", wordBreak: "break-all" }}>
            {url}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
