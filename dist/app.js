(() => {
  const body = document.body;
  const panel = document.querySelector("#content-panel");
  const backdrop = document.querySelector(".panel-backdrop");
  const panelTitle = document.querySelector("#panel-title");
  const panelKicker = document.querySelector("#panel-kicker");
  const panelContent = document.querySelector("#panel-content");
  const imageDialog = document.querySelector("#image-dialog");
  const imageDialogImage = imageDialog.querySelector("img");
  const imageDialogCaption = imageDialog.querySelector("p");
  const motionToggle = document.querySelector(".motion-toggle");
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let lastTrigger = null;
  let panelTimer = null;
  let portraitAnimator = null;
  let gardenAnimator = null;
  let splashCursorAnimator = null;

  const panels = {
    resume: { kicker: "PROFILE · EDUCATION", title: "简历与教育" },
    internships: { kicker: "01 · EXPERIENCE", title: "实习轨迹" },
    projects: { kicker: "02 · PROJECTS · PORTFOLIO", title: "项目与作品" },
    skills: { kicker: "03 · SKILL MAP", title: "技能坐标" },
  };

  const getFocusable = () => [...panel.querySelectorAll("button, a, [tabindex]:not([tabindex='-1'])")]
    .filter((element) => !element.disabled && !element.hidden);

  function openPanel(key, trigger) {
    const config = panels[key];
    const templateKeys = key === "projects" ? ["projects", "portfolio"] : [key];
    const templates = templateKeys.map((templateKey) => document.querySelector(`#template-${templateKey}`));
    if (!config || templates.some((template) => !template)) return;

    clearTimeout(panelTimer);
    lastTrigger = trigger;
    panelTitle.textContent = config.title;
    panelKicker.textContent = config.kicker;
    const fragment = document.createDocumentFragment();
    templates.forEach((template, index) => {
      if (index > 0) {
        const divider = document.createElement("div");
        divider.className = "panel-section-divider";
        divider.setAttribute("aria-hidden", "true");
        fragment.append(divider);
      }
      fragment.append(template.content.cloneNode(true));
    });
    panelContent.replaceChildren(fragment);
    panelContent.scrollTop = 0;
    panel.hidden = false;
    backdrop.hidden = false;
    body.classList.add("panel-open");

    requestAnimationFrame(() => {
      panel.classList.add("is-open");
      backdrop.classList.add("is-open");
      panel.querySelector(".panel-close").focus();
    });
  }

  function closePanel() {
    if (panel.hidden) return;
    panel.classList.remove("is-open");
    backdrop.classList.remove("is-open");
    body.classList.remove("panel-open");
    document.dispatchEvent(new CustomEvent("portrait:unlock"));
    panelTimer = window.setTimeout(() => {
      panel.hidden = true;
      backdrop.hidden = true;
      panelContent.replaceChildren();
      lastTrigger?.focus();
    }, body.classList.contains("motion-reduced") || prefersReducedMotion.matches ? 0 : 620);
  }

  document.querySelectorAll("[data-panel]").forEach((button) => {
    button.addEventListener("click", () => openPanel(button.dataset.panel, button));
  });
  document.querySelectorAll("[data-close-panel]").forEach((button) => button.addEventListener("click", closePanel));

  panel.addEventListener("click", (event) => {
    const work = event.target.closest(".work-card, .story-image-button");
    if (!work) return;
    imageDialogImage.src = work.dataset.image;
    imageDialogImage.alt = work.classList.contains("story-image-button")
      ? work.dataset.title
      : `${work.dataset.title}研究结果图`;
    imageDialogCaption.textContent = work.dataset.title;
    imageDialog.showModal();
  });

  imageDialog.querySelector(".image-close").addEventListener("click", () => imageDialog.close());
  imageDialog.addEventListener("click", (event) => {
    if (event.target === imageDialog) imageDialog.close();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden && !imageDialog.open) closePanel();
    if (event.key !== "Tab" || panel.hidden || imageDialog.open) return;
    const focusable = getFocusable();
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  function setReducedMotion(reduced) {
    body.classList.toggle("motion-reduced", reduced);
    motionToggle.setAttribute("aria-pressed", String(reduced));
    motionToggle.querySelector(".motion-label").textContent = reduced ? "恢复动效" : "减弱动效";
    portraitAnimator?.setReduced(reduced);
    gardenAnimator?.setReduced(reduced);
    splashCursorAnimator?.setReduced(reduced);
  }
  setReducedMotion(prefersReducedMotion.matches);
  motionToggle.addEventListener("click", () => setReducedMotion(!body.classList.contains("motion-reduced")));

  function initPortraitStates() {
    const portrait = document.querySelector(".portrait-art");
    const navigation = document.querySelector(".sketch-nav");
    const nodes = [...document.querySelectorAll(".sketch-node[data-pose]")];
    if (!portrait || !navigation || !nodes.length) return;

    const defaultPose = "ip-crayon-default-v1.png";
    const poseLabels = {
      "ip-crayon-default-v1.png": "站立微笑的粉色裙装蜡笔人物 IP",
      "ip-crayon-laptop-v1.png": "使用笔记本电脑的粉色裙装蜡笔人物 IP",
      "ip-crayon-book-v1.png": "阅读书本的粉色裙装蜡笔人物 IP",
      "ip-crayon-wave-v1.png": "挥手介绍经历的粉色裙装蜡笔人物 IP",
      "ip-crayon-cake-v1.png": "展示成果蛋糕的粉色裙装蜡笔人物 IP",
    };
    let reduced = body.classList.contains("motion-reduced") || prefersReducedMotion.matches;
    let currentPose = defaultPose;
    let lockedPose = null;
    const preloadedPoses = [];

    Object.keys(poseLabels).forEach((file) => {
      const preload = new Image();
      preload.src = `./assets/${file}`;
      preloadedPoses.push(preload);
    });

    const setPose = (file) => {
      if (!file || file === currentPose) return;
      currentPose = file;
      portrait.src = `./assets/${file}`;
      portrait.alt = poseLabels[file] || "粉色裙装蜡笔人物 IP";
      if (!reduced) {
        portrait.classList.remove("is-changing");
        requestAnimationFrame(() => portrait.classList.add("is-changing"));
      }
    };

    portrait.addEventListener("animationend", () => portrait.classList.remove("is-changing"));
    nodes.forEach((node) => {
      const activate = () => setPose(node.dataset.pose);
      node.addEventListener("pointerenter", activate, { passive: true });
      node.addEventListener("focus", activate);
      node.addEventListener("click", () => {
        lockedPose = node.dataset.pose;
        setPose(lockedPose);
      });
      node.addEventListener("blur", () => {
        requestAnimationFrame(() => {
          if (!lockedPose && !navigation.contains(document.activeElement)) setPose(defaultPose);
        });
      });
    });
    navigation.addEventListener("pointerleave", () => {
      if (!lockedPose && !navigation.contains(document.activeElement)) setPose(defaultPose);
    }, { passive: true });
    document.addEventListener("portrait:unlock", () => {
      lockedPose = null;
      if (!navigation.matches(":hover") && !navigation.contains(document.activeElement)) {
        setPose(defaultPose);
      }
    });

    portraitAnimator = {
      setReduced(value) {
        reduced = value;
        if (value) portrait.classList.remove("is-changing");
      },
    };
  }

  initPortraitStates();

  function initGardenMotion() {
    const stage = document.querySelector(".hero-stage");
    const garden = document.querySelector(".spring-garden");
    if (!stage || !garden) return;

    let reduced = body.classList.contains("motion-reduced") || prefersReducedMotion.matches;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let animationFrame = 0;

    const render = () => {
      animationFrame = 0;
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;
      if (Math.abs(targetX - currentX) < 0.02) currentX = targetX;
      if (Math.abs(targetY - currentY) < 0.02) currentY = targetY;
      garden.style.setProperty("--garden-x", `${currentX.toFixed(2)}px`);
      garden.style.setProperty("--garden-y", `${currentY.toFixed(2)}px`);
      if (currentX !== targetX || currentY !== targetY) animationFrame = requestAnimationFrame(render);
    };

    const update = () => {
      if (!animationFrame) animationFrame = requestAnimationFrame(render);
    };

    stage.addEventListener("pointermove", (event) => {
      if (reduced) return;
      const bounds = stage.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
      const y = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
      targetX = (x - 0.5) * 16;
      targetY = (y - 0.5) * 10;
      garden.style.setProperty("--bloom-x", `${(x * 100).toFixed(1)}%`);
      garden.style.setProperty("--bloom-y", `${(y * 100).toFixed(1)}%`);
      update();
    }, { passive: true });

    stage.addEventListener("pointerdown", (event) => {
      if (reduced) return;
      const bounds = stage.getBoundingClientRect();
      const x = ((event.clientX - bounds.left) / bounds.width) * 100;
      const y = ((event.clientY - bounds.top) / bounds.height) * 100;
      garden.style.setProperty("--bloom-x", `${x.toFixed(1)}%`);
      garden.style.setProperty("--bloom-y", `${y.toFixed(1)}%`);
      garden.classList.remove("is-blooming");
      requestAnimationFrame(() => garden.classList.add("is-blooming"));
    }, { passive: true });

    stage.addEventListener("pointerleave", () => {
      targetX = 0;
      targetY = 0;
      update();
    }, { passive: true });
    garden.addEventListener("animationend", () => garden.classList.remove("is-blooming"));

    gardenAnimator = {
      setReduced(value) {
        reduced = value;
        if (!value) return;
        targetX = 0;
        targetY = 0;
        currentX = 0;
        currentY = 0;
        garden.classList.remove("is-blooming");
        garden.style.setProperty("--garden-x", "0px");
        garden.style.setProperty("--garden-y", "0px");
      },
    };

    addEventListener("pagehide", () => cancelAnimationFrame(animationFrame), { once: true });
  }

  initGardenMotion();

  function initSplashCursor() {
    const stage = document.querySelector(".hero-stage");
    const canvas = document.querySelector(".splash-cursor-layer");
    const lollipop = document.querySelector(".lollipop-cursor");
    if (!stage || !canvas || !lollipop) return;

    const context = canvas.getContext("2d", { alpha: true });
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!context) return;

    const colors = [
      [232, 129, 151],
      [246, 176, 116],
      [181, 153, 202],
      [130, 178, 116],
      [239, 199, 91],
      [116, 165, 205],
    ];
    let reduced = body.classList.contains("motion-reduced") || prefersReducedMotion.matches;
    let enabled = finePointer.matches && !reduced;
    let width = 0;
    let height = 0;
    let frame = 0;
    let lastTime = 0;
    let previousX = null;
    let previousY = null;
    let lastSplatX = null;
    let lastSplatY = null;
    let colorIndex = 0;
    let pointerFrame = 0;
    let pendingPointer = null;
    let ripples = [];
    let droplets = [];
    const maxRipples = 10;
    const maxDroplets = 30;
    const splatSpacing = 30;

    const colorString = (color, alpha) => `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;

    const resize = () => {
      const bounds = stage.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, bounds.width < 720 ? 0.8 : 1);
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const schedule = () => {
      if (!frame && enabled) frame = requestAnimationFrame(render);
    };

    const addRipple = (x, y, strength = 1, delay = 0) => {
      const color = colors[colorIndex++ % colors.length];
      if (ripples.length >= maxRipples) ripples.splice(0, ripples.length - maxRipples + 1);
      ripples.push({
        x,
        y,
        age: -delay,
        life: 0.76 + strength * 0.26,
        radius: 7 + strength * 3,
        growth: 52 + strength * 34,
        width: 2.4 + strength * 1.4,
        color,
      });
      schedule();
    };

    const addDroplets = (x, y, dx, dy, amount) => {
      const speed = Math.min(130, Math.hypot(dx, dy) * 4 + 26);
      for (let index = 0; index < amount; index += 1) {
        const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 1.7;
        const velocity = speed * (0.35 + Math.random() * 0.7);
        droplets.push({
          x,
          y,
          vx: Math.cos(angle) * velocity,
          vy: Math.sin(angle) * velocity,
          age: 0,
          life: 0.55 + Math.random() * 0.48,
          radius: 2.2 + Math.random() * 4.2,
          color: colors[(colorIndex + index) % colors.length],
        });
      }
      if (droplets.length > maxDroplets) droplets.splice(0, droplets.length - maxDroplets);
      schedule();
    };

    function render(time) {
      frame = 0;
      const delta = Math.min(0.034, Math.max(0.001, (time - (lastTime || time - 16)) / 1000));
      lastTime = time;
      context.clearRect(0, 0, width, height);
      context.save();
      context.globalCompositeOperation = "source-over";

      ripples = ripples.filter((ripple) => {
        ripple.age += delta;
        if (ripple.age < 0) return true;
        if (ripple.age >= ripple.life) return false;
        const progress = ripple.age / ripple.life;
        const eased = 1 - (1 - progress) ** 3;
        context.beginPath();
        context.arc(ripple.x, ripple.y, ripple.radius + ripple.growth * eased, 0, Math.PI * 2);
        context.strokeStyle = colorString(ripple.color, (1 - progress) * 0.34);
        context.lineWidth = ripple.width * (1 - progress * 0.55);
        context.stroke();
        return true;
      });

      droplets = droplets.filter((droplet) => {
        droplet.age += delta;
        if (droplet.age >= droplet.life) return false;
        const progress = droplet.age / droplet.life;
        droplet.vx *= 0.975;
        droplet.vy *= 0.975;
        droplet.vy += 10 * delta;
        droplet.x += droplet.vx * delta;
        droplet.y += droplet.vy * delta;
        context.beginPath();
        context.arc(droplet.x, droplet.y, droplet.radius * (1 - progress * 0.45), 0, Math.PI * 2);
        context.fillStyle = colorString(droplet.color, (1 - progress) * 0.42);
        context.fill();
        return true;
      });

      context.restore();
      if (enabled && (ripples.length || droplets.length)) frame = requestAnimationFrame(render);
    }

    const localPosition = (event) => {
      const bounds = stage.getBoundingClientRect();
      return {
        x: Math.max(0, Math.min(bounds.width, event.clientX - bounds.left)),
        y: Math.max(0, Math.min(bounds.height, event.clientY - bounds.top)),
      };
    };

    stage.addEventListener("pointerenter", (event) => {
      if (!enabled || event.pointerType === "touch") return;
      const { x, y } = localPosition(event);
      previousX = x;
      previousY = y;
      lastSplatX = x;
      lastSplatY = y;
      lollipop.classList.add("is-visible");
    }, { passive: true });

    const flushPointerMove = () => {
      pointerFrame = 0;
      if (!enabled || !pendingPointer) return;
      const { x, y, dx, dy } = pendingPointer;
      pendingPointer = null;
      const angle = Math.atan2(dy, dx) * 180 / Math.PI + 38;
      lollipop.style.transform = `translate3d(${(x - 24).toFixed(1)}px, ${(y - 20).toFixed(1)}px, 0) rotate(${angle.toFixed(1)}deg)`;
      lollipop.classList.add("is-visible");

      const splatDistance = lastSplatX === null ? Infinity : Math.hypot(x - lastSplatX, y - lastSplatY);
      if (splatDistance > splatSpacing) {
        const strength = Math.min(1.8, 0.55 + Math.hypot(dx, dy) / 18);
        addRipple(x, y, strength);
        addDroplets(x, y, dx, dy, Math.hypot(dx, dy) > 18 ? 2 : 1);
        lastSplatX = x;
        lastSplatY = y;
      }
    };

    stage.addEventListener("pointermove", (event) => {
      if (!enabled || event.pointerType === "touch") return;
      const { x, y } = localPosition(event);
      const dx = previousX === null ? 0 : x - previousX;
      const dy = previousY === null ? 0 : y - previousY;
      if (pendingPointer) {
        pendingPointer.x = x;
        pendingPointer.y = y;
        pendingPointer.dx += dx;
        pendingPointer.dy += dy;
      } else {
        pendingPointer = { x, y, dx, dy };
      }
      previousX = x;
      previousY = y;
      if (!pointerFrame) pointerFrame = requestAnimationFrame(flushPointerMove);
    }, { passive: true });

    stage.addEventListener("pointerdown", (event) => {
      if (!enabled || event.pointerType === "touch") return;
      const { x, y } = localPosition(event);
      addRipple(x, y, 1.9);
      addRipple(x, y, 1.45, 0.09);
      addRipple(x, y, 1.1, 0.18);
      addDroplets(x, y, (previousX ?? x) - x + 4, (previousY ?? y) - y - 4, 7);
      lollipop.classList.remove("is-popping");
      requestAnimationFrame(() => lollipop.classList.add("is-popping"));
    }, { passive: true });

    stage.addEventListener("pointerleave", () => {
      lollipop.classList.remove("is-visible", "is-popping");
      previousX = null;
      previousY = null;
      lastSplatX = null;
      lastSplatY = null;
      pendingPointer = null;
      cancelAnimationFrame(pointerFrame);
      pointerFrame = 0;
    }, { passive: true });
    lollipop.addEventListener("animationend", () => lollipop.classList.remove("is-popping"));

    const clear = () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(pointerFrame);
      frame = 0;
      pointerFrame = 0;
      pendingPointer = null;
      lastTime = 0;
      ripples = [];
      droplets = [];
      context.clearRect(0, 0, width, height);
      lollipop.classList.remove("is-visible", "is-popping");
    };

    const updateEnabled = () => {
      enabled = finePointer.matches && !reduced;
      stage.classList.toggle("has-splash-cursor", enabled);
      if (!enabled) clear();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(stage);
    finePointer.addEventListener("change", updateEnabled);
    const handleVisibilityChange = () => {
      if (document.hidden) clear();
      else updateEnabled();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    resize();
    updateEnabled();

    splashCursorAnimator = {
      setReduced(value) {
        reduced = value;
        updateEnabled();
      },
    };

    addEventListener("pagehide", () => {
      clear();
      resizeObserver.disconnect();
      finePointer.removeEventListener("change", updateEnabled);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, { once: true });
  }

  initSplashCursor();
})();
