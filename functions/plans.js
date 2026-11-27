// ShopMaster Pro - Public Pro Plans
// Cloudflare Pages Function

export async function onRequestGet() {
  const plans = [
    {
      key: "pro_monthly",
      label: "Monthly Pro (30 Days)",
      amount: 99
    },
    {
      key: "pro_yearly",
      label: "Yearly Pro (365 Days)",
      amount: 999
    }
  ];

  return new Response(JSON.stringify(plans), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300"
    }
  });
}
