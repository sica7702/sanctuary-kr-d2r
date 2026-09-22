// ↓ 여기 한 줄만 실제 Discord 초대 주소로 바꾸세요.
    const DISCORD_INVITE_URL = "https://discord.gg/Ws3Bda7wHK";

    document.querySelectorAll(".discord-link").forEach(link => {
      link.href = DISCORD_INVITE_URL;
    });
