export const Translations = Object.freeze({
    Msg: {
        SystemReload: "system.reload" as const,
        Permissions: {
            InvalidIdentifier: "%permissions.invalidIdentifier",
            InvalidName: "%permissions.invalidName",
            ExistingGroup: "%permissions.existingGroup"
        }
    },
    Ui: {
        General: {
            BackButton: "%back.button" as const,
            SubTextOpen: "%ui.subText.open" as const,
            SubTextEdit: "%ui.subText.edit" as const,
            SubTextManage: "%ui.subText.manage" as const,
            SubmitTextConfirm: "%ui.submitText.confirm" as const,
            ConfirmYes: "%ui.confirm.yes" as const,
            ConfirmNo: "%ui.confirm.no" as const,
        },
        MainMenu: {
            Title: "%mainMenu.title" as const,
            Button1Text: "%mainMenu.button1.text" as const,
            Button2Text: "%mainMenu.button2.text" as const,
            Button3Text: "%mainMenu.button3.text" as const,
        },
        Settings: {
            Main: {
                Title: "%settings.main.title" as const,
                Button1Text: "%settings.main.button1.text" as const,
                Button2Text: "%settings.main.button2.text" as const,
            },
            Config: {
                Title: "%settings.config.title" as const,
                Input1Name: "%settings.config.input1.name" as const,
                Input2Name: "%settings.config.input2.name" as const,
                Input3Name: "%settings.config.input3.name" as const,
            },
            Admins: {
                Title: "%settings.admins.main.title" as const,
                Body: "%settings.admins.main.body" as const,
                Button1Text: "%settings.admins.main.button1.text" as const,
            },
        },
        Plugins: {
            Main: {
                Title: "%pluginsMain.title" as const,
                ButtonsRanksText: "%pluginsMain.buttons.ranks.text" as const,
            },
        },
    },
} as const);

type LeafValues<T> = T extends string
    ? T
    : T extends Record<string, any>
        ? LeafValues<T[keyof T]>
        : never;

export type TranslationsType = LeafValues<typeof Translations>;