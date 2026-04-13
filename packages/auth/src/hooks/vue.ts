import type {
  AuthSessionStore,
  VueAuthSessionComposable,
  VueRefLike,
  VueRuntimeBindings,
} from "../shared/index.js";

export function createVueAuthSessionComposable(
  sessionStore: AuthSessionStore,
  runtime: VueRuntimeBindings
): () => VueAuthSessionComposable {
  return () => {
    const sessionRef = runtime.ref(sessionStore.getSnapshot());

    const syncFromStore = (): void => {
      sessionRef.value = sessionStore.getSnapshot();
    };

    const subscribe = (): (() => void) => {
      return sessionStore.subscribe(syncFromStore);
    };

    let unsubscribe = subscribe();

    if (runtime.onMounted) {
      runtime.onMounted(() => {
        unsubscribe();
        unsubscribe = subscribe();
      });
    }

    if (runtime.onBeforeUnmount) {
      runtime.onBeforeUnmount(() => {
        unsubscribe();
      });
    }

    const session = (runtime.readonly
      ? runtime.readonly(sessionRef)
      : sessionRef) as VueRefLike<ReturnType<AuthSessionStore["getSnapshot"]>>;

    return {
      session,
      refreshAuthSession: () => sessionStore.refresh(),
      disposeAuthSessionStore: () => sessionStore.dispose(),
    };
  };
}

export type { VueAuthSessionComposable, VueRuntimeBindings } from "../shared/index.js";
