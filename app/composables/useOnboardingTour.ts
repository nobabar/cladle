import { computed } from "vue";
import { driver } from "driver.js";

/** Persisted tour completion */
export const ONBOARDING_DAILY_TOUR_COMPLETE_KEY = "cladle:onboarding:daily:v1";

export function useOnboardingTour() {
  const { t } = useI18n();

  const hasCompletedOnboarding = computed(() => {
    if (!import.meta.client) {
      return false;
    }
    return localStorage.getItem(ONBOARDING_DAILY_TOUR_COMPLETE_KEY) === "done";
  });

  function markOnboardingAsCompleted() {
    if (!import.meta.client) {
      return;
    }
    localStorage.setItem(ONBOARDING_DAILY_TOUR_COMPLETE_KEY, "done");
  }

  function resetOnboarding() {
    if (!import.meta.client) {
      return;
    }
    localStorage.removeItem(ONBOARDING_DAILY_TOUR_COMPLETE_KEY);
  }

  function startDailyTour() {
    if (!import.meta.client) {
      return;
    }

    function ensureInformationPostitIsOpen(preferredNode?: Element | null): Promise<void> {
      return new Promise((resolve) => {
        const isPostitOpen = () => !!document.querySelector("[data-onboarding='daily-information-postit']");
        if (isPostitOpen()) {
          resolve();
          return;
        }

        // A real user click can open the panel asynchronously. Wait a beat
        // before sending a synthetic click to avoid double-toggle races.
        window.setTimeout(() => {
          if (isPostitOpen()) {
            resolve();
            return;
          }

          const fallbackNode = document.querySelector<Element>(
            "[data-onboarding='daily-tree'] .tree-node-group-rough[role='button']",
          );
          const targetNode = preferredNode?.isConnected ? preferredNode : fallbackNode;

          if (!targetNode) {
            resolve();
            return;
          }

          targetNode.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
          window.setTimeout(() => resolve(), 220);
        }, 80);
      });
    }

    function closeInformationPostit(): void {
      const stickyTab = document.querySelector<HTMLElement>(
        "[data-onboarding='daily-information-postit'] .information-panel-postit__sticky-tab",
      );
      if (!stickyTab) {
        return;
      }

      stickyTab.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    }

    let onboardingDriver: ReturnType<typeof driver> | null = null;
    let didAdvanceFromTreeStep = false;
    let didAdvanceFromSearchStep = false;
    let didAdvanceFromPostitStep = false;
    let shouldScrollToTopAfterTour = false;
    let cleanupTreeStepListener: (() => void) | null = null;
    let cleanupSearchStepListener: (() => void) | null = null;
    let cleanupPostitStepListener: (() => void) | null = null;
    let cleanupSearchHitboxObserver: (() => void) | null = null;
    let cleanupPostitStepRefresh: (() => void) | null = null;
    let refreshRafId: number | null = null;
    let postitAdvanceTimeout: number | null = null;

    function canMoveNext(): boolean {
      return !!onboardingDriver
        && onboardingDriver.isActive()
        && onboardingDriver.hasNextStep();
    }

    function queueDriverRefresh() {
      if (!onboardingDriver) {
        return;
      }
      if (refreshRafId !== null) {
        return;
      }
      refreshRafId = window.requestAnimationFrame(() => {
        refreshRafId = null;
        onboardingDriver?.refresh();
      });
    }

    function observeElementForRefresh(element: Element): () => void {
      const resizeObserver = typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => queueDriverRefresh())
        : null;
      resizeObserver?.observe(element);

      const mutationObserver = new MutationObserver(() => queueDriverRefresh());
      mutationObserver.observe(element, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true,
      });

      return () => {
        resizeObserver?.disconnect();
        mutationObserver.disconnect();
      };
    }

    function clearPostitStepRefresh() {
      cleanupPostitStepRefresh?.();
      cleanupPostitStepRefresh = null;
    }

    function clearSearchHitboxObserver() {
      cleanupSearchHitboxObserver?.();
      cleanupSearchHitboxObserver = null;
    }

    function setupDynamicSearchHitbox(searchRoot: HTMLElement) {
      const cleanups: Array<() => void> = [];
      const extraBufferPx = 20;
      let cleanupObservedPanel: (() => void) | null = null;

      function applyHitboxFromPanel() {
        const panel = searchRoot.querySelector<HTMLElement>(".animal-search__dropdown-panel");
        const panelHeight = panel?.offsetHeight ?? 0;
        const extra = panelHeight > 0 ? panelHeight + extraBufferPx : 0;
        searchRoot.style.setProperty("--onboarding-search-extra", `${extra}px`);
        queueDriverRefresh();
      }

      function observePanelSize(panel: HTMLElement) {
        const resizeObserver = typeof ResizeObserver !== "undefined"
          ? new ResizeObserver(() => applyHitboxFromPanel())
          : null;
        resizeObserver?.observe(panel);

        const mutationObserver = new MutationObserver(() => applyHitboxFromPanel());
        mutationObserver.observe(panel, {
          childList: true,
          subtree: true,
          attributes: true,
          characterData: true,
        });

        return () => {
          resizeObserver?.disconnect();
          mutationObserver.disconnect();
        };
      }

      function reconnectPanelObserver() {
        cleanupObservedPanel?.();
        cleanupObservedPanel = null;

        const panel = searchRoot.querySelector<HTMLElement>(".animal-search__dropdown-panel");
        if (panel) {
          cleanupObservedPanel = observePanelSize(panel);
        }
        applyHitboxFromPanel();
      }

      const rootMutationObserver = new MutationObserver(() => reconnectPanelObserver());
      rootMutationObserver.observe(searchRoot, {
        childList: true,
        subtree: true,
      });
      cleanups.push(() => rootMutationObserver.disconnect());

      const onWindowResize = () => applyHitboxFromPanel();
      const onWindowScroll = () => queueDriverRefresh();
      window.addEventListener("resize", onWindowResize);
      window.addEventListener("scroll", onWindowScroll, true);
      cleanups.push(() => {
        window.removeEventListener("resize", onWindowResize);
        window.removeEventListener("scroll", onWindowScroll, true);
      });

      reconnectPanelObserver();
      window.setTimeout(() => applyHitboxFromPanel(), 0);
      window.setTimeout(() => applyHitboxFromPanel(), 120);

      cleanupSearchHitboxObserver = () => {
        cleanupObservedPanel?.();
        searchRoot.style.removeProperty("--onboarding-search-extra");
        cleanups.splice(0).forEach(cleanup => cleanup());
      };
    }

    function setupPostitStepRefresh() {
      const cleanups: Array<() => void> = [];
      const postitElement = document.querySelector("[data-onboarding='daily-information-postit']");
      if (postitElement) {
        cleanups.push(observeElementForRefresh(postitElement));
      }

      const onWindowResize = () => queueDriverRefresh();
      const onWindowScroll = () => queueDriverRefresh();
      window.addEventListener("resize", onWindowResize);
      window.addEventListener("scroll", onWindowScroll, true);
      cleanups.push(() => {
        window.removeEventListener("resize", onWindowResize);
        window.removeEventListener("scroll", onWindowScroll, true);
      });

      window.setTimeout(() => queueDriverRefresh(), 0);
      window.setTimeout(() => queueDriverRefresh(), 150);
      window.setTimeout(() => queueDriverRefresh(), 320);

      cleanupPostitStepRefresh = () => {
        cleanups.splice(0).forEach(cleanup => cleanup());
      };
    }

    function clearTreeStepListener() {
      cleanupTreeStepListener?.();
      cleanupTreeStepListener = null;
    }

    function clearSearchStepListener() {
      cleanupSearchStepListener?.();
      cleanupSearchStepListener = null;
      clearSearchHitboxObserver();
    }

    function clearPostitStepListener() {
      cleanupPostitStepListener?.();
      cleanupPostitStepListener = null;
      clearPostitStepRefresh();
      if (postitAdvanceTimeout) {
        clearTimeout(postitAdvanceTimeout);
        postitAdvanceTimeout = null;
      }
    }

    async function moveFromTreeToPostitOnce(clickedNode?: Element | null) {
      if (didAdvanceFromTreeStep) {
        return;
      }
      didAdvanceFromTreeStep = true;
      clearTreeStepListener();
      await ensureInformationPostitIsOpen(clickedNode);
      if (canMoveNext()) {
        onboardingDriver?.moveNext();
      }
    }

    async function moveFromSearchToTreeOnce() {
      if (didAdvanceFromSearchStep) {
        return;
      }
      didAdvanceFromSearchStep = true;
      clearSearchStepListener();
      if (canMoveNext()) {
        onboardingDriver?.moveNext();
      }
    }

    function moveFromPostitToPreferencesOnce() {
      if (didAdvanceFromPostitStep) {
        return;
      }
      if (!canMoveNext()) {
        return;
      }
      didAdvanceFromPostitStep = true;
      clearPostitStepListener();
      onboardingDriver?.moveNext();
    }

    function snapPageToTop() {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      const scrollingElement = document.scrollingElement ?? document.documentElement;
      scrollingElement.scrollTop = 0;
      document.body.scrollTop = 0;
      window.scrollTo(0, 0);
    }

    /** Scroll the window to the top (smooth when supported, then snap for reliability). */
    function scrollPageToTop() {
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
      window.setTimeout(snapPageToTop, 500);
    }

    /** Driver refocuses after teardown and can undo the scroll; retry smooth then snap. */
    function scheduleScrollToTopAfterTeardown() {
      window.setTimeout(() => {
        scrollPageToTop();
        window.setTimeout(snapPageToTop, 500);
        window.setTimeout(() => {
          snapPageToTop();
          document.querySelector<HTMLElement>("[data-onboarding='daily-search'] input")
            ?.focus({ preventScroll: true });
        }, 900);
      }, 400);
    }

    /**
     * Must call `driver.destroy()`: the default last-step handler only runs `onDestroyStarted`.
     * @param tourDriver - Active Driver.js instance for this tour.
     */
    function completeTourAndScrollToTop(tourDriver: ReturnType<typeof driver>) {
      shouldScrollToTopAfterTour = true;
      scrollPageToTop();
      tourDriver.destroy();
    }

    onboardingDriver = driver({
      showProgress: true,
      // Close button + Escape; backdrop clicks are ignored via overlayClickBehavior.
      allowClose: true,
      overlayClickBehavior: () => {},
      nextBtnText: t("onboarding.next"),
      prevBtnText: t("onboarding.previous"),
      doneBtnText: t("onboarding.done"),
      progressText: "{{current}} / {{total}}",
      stagePadding: 20,
      steps: [
        {
          element: "[data-onboarding='daily-date']",
          popover: {
            title: t("onboarding.daily.dateTitle"),
            description: t("onboarding.daily.dateBody"),
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "[data-onboarding='daily-search']",
          onHighlighted: () => {
            didAdvanceFromSearchStep = false;
            const searchRoot = document.querySelector<HTMLElement>("[data-onboarding='daily-search']");
            searchRoot?.classList.add("onboarding-search-hitbox");
            if (searchRoot) {
              setupDynamicSearchHitbox(searchRoot);
            }
            window.setTimeout(() => queueDriverRefresh(), 0);
            window.setTimeout(() => queueDriverRefresh(), 80);

            const onGuessSubmitted = () => {
              void moveFromSearchToTreeOnce();
            };

            window.addEventListener("cladle:onboarding:guess-submitted", onGuessSubmitted);
            cleanupSearchStepListener = () => {
              window.removeEventListener("cladle:onboarding:guess-submitted", onGuessSubmitted);
              searchRoot?.classList.remove("onboarding-search-hitbox");
            };
          },
          onDeselected: () => {
            clearSearchStepListener();
            queueDriverRefresh();
          },
          popover: {
            title: t("onboarding.daily.searchTitle"),
            description: t("onboarding.daily.searchBody"),
            side: "top",
            align: "center",
            onNextClick: () => {
              if (canMoveNext()) {
                onboardingDriver?.moveNext();
              }
            },
          },
        },
        {
          element: "[data-onboarding='daily-tree']",
          onHighlighted: () => {
            didAdvanceFromTreeStep = false;

            const onTreeNodeClick = (event: Event) => {
              const target = event.target as Element | null;
              const clickedNode = target?.closest?.(
                "[data-onboarding='daily-tree'] .tree-node-group-rough[role='button']",
              );
              if (!clickedNode) {
                return;
              }
              void moveFromTreeToPostitOnce(clickedNode);
            };

            document.addEventListener("click", onTreeNodeClick, true);
            cleanupTreeStepListener = () => {
              document.removeEventListener("click", onTreeNodeClick, true);
            };
          },
          onDeselected: () => {
            clearTreeStepListener();
          },
          popover: {
            title: t("onboarding.daily.treeTitle"),
            description: t("onboarding.daily.treeBody"),
            side: "top",
            align: "center",
            onNextClick: async () => {
              await moveFromTreeToPostitOnce();
            },
          },
        },
        {
          element: "[data-onboarding='daily-information-postit']",
          onHighlighted: () => {
            didAdvanceFromPostitStep = false;
            setupPostitStepRefresh();
            const onPostitClosed = () => {
              if (postitAdvanceTimeout) {
                clearTimeout(postitAdvanceTimeout);
              }
              postitAdvanceTimeout = window.setTimeout(() => {
                postitAdvanceTimeout = null;
                moveFromPostitToPreferencesOnce();
              }, 220);
            };

            window.addEventListener("cladle:onboarding:postit-closed", onPostitClosed);
            cleanupPostitStepListener = () => {
              window.removeEventListener("cladle:onboarding:postit-closed", onPostitClosed);
            };
          },
          onDeselected: () => {
            clearPostitStepListener();
          },
          popover: {
            title: t("onboarding.daily.postitTitle"),
            description: t("onboarding.daily.postitBody"),
            side: "left",
            align: "start",
            onNextClick: () => {
              closeInformationPostit();
              if (canMoveNext()) {
                onboardingDriver?.moveNext();
              }
            },
          },
        },
        {
          element: "[data-onboarding='footer-help-link']",
          onHighlighted: () => {
            onboardingDriver?.setConfig({
              stagePadding: 8,
            });
            queueDriverRefresh();
          },
          popover: {
            title: t("onboarding.daily.helpTitle"),
            description: t("onboarding.daily.helpBody"),
            side: "top",
            align: "start",
            onNextClick: (_element, _step, { driver: tourDriver }) => {
              completeTourAndScrollToTop(tourDriver);
            },
          },
        },
      ],
      onDestroyed: () => {
        clearTreeStepListener();
        clearSearchStepListener();
        clearPostitStepListener();
        if (refreshRafId !== null) {
          window.cancelAnimationFrame(refreshRafId);
          refreshRafId = null;
        }
        markOnboardingAsCompleted();
        if (shouldScrollToTopAfterTour) {
          shouldScrollToTopAfterTour = false;
          scheduleScrollToTopAfterTeardown();
        }
      },
    });

    onboardingDriver.drive();
  }

  return {
    hasCompletedOnboarding,
    startDailyTour,
    markOnboardingAsCompleted,
    resetOnboarding,
  };
}
