//
//  String+Localization.swift
//  IndigoInvestor
//
//  Created by Indigo Yield Platform
//  Copyright © 2024 Indigo. All rights reserved.
//

import Foundation

extension String {
    /// Returns a localized string for the given key
    var localized: String {
        return NSLocalizedString(self, comment: "")
    }
    
    /// Returns a localized string with the specified comment for translators
    func localized(comment: String) -> String {
        return NSLocalizedString(self, comment: comment)
    }
    
    /// Returns a localized string with formatting arguments
    func localized(with arguments: CVarArg...) -> String {
        return String(format: self.localized, arguments: arguments)
    }
    
    /// Returns a localized string from a specific table
    func localized(tableName: String? = nil, bundle: Bundle = .main, value: String = "", comment: String = "") -> String {
        return NSLocalizedString(self, tableName: tableName, bundle: bundle, value: value, comment: comment)
    }
    
    /// Returns a pluralized localized string
    func localizedPlural(count: Int) -> String {
        return String.localizedStringWithFormat(self.localized, count)
    }
}

// MARK: - Localization Keys
struct LocalizationKeys {
    // MARK: - General
    struct General {
        static let appName = "app.name"
        static let loading = "loading"
        static let error = "error"
        static let success = "success"
        static let cancel = "cancel"
        static let done = "done"
        static let save = "save"
        static let delete = "delete"
        static let edit = "edit"
        static let close = "close"
        static let ok = "ok"
        static let yes = "yes"
        static let no = "no"
        static let retry = "retry"
        static let refresh = "refresh"
        static let search = "search"
        static let filter = "filter"
        static let sort = "sort"
        static let share = "share"
        static let download = "download"
        static let upload = "upload"
        static let copied = "copied"
    }
    
    // MARK: - Authentication
    struct Auth {
        static let signInTitle = "auth.signin.title"
        static let signInSubtitle = "auth.signin.subtitle"
        static let signInEmail = "auth.signin.email"
        static let signInPassword = "auth.signin.password"
        static let signInButton = "auth.signin.button"
        static let signInForgot = "auth.signin.forgot"
        static let signInBiometric = "auth.signin.biometric"
        static let signInBiometricTouchID = "auth.signin.biometric.touchid"
        static let signInErrorInvalid = "auth.signin.error.invalid"
        static let signInErrorNetwork = "auth.signin.error.network"
        
        static let signUpTitle = "auth.signup.title"
        static let signUpSubtitle = "auth.signup.subtitle"
        static let signUpFirstName = "auth.signup.firstname"
        static let signUpLastName = "auth.signup.lastname"
        static let signUpEmail = "auth.signup.email"
        static let signUpPassword = "auth.signup.password"
        static let signUpConfirm = "auth.signup.confirm"
        static let signUpButton = "auth.signup.button"
        static let signUpTerms = "auth.signup.terms"
        
        static let resetTitle = "auth.reset.title"
        static let resetSubtitle = "auth.reset.subtitle"
        static let resetEmail = "auth.reset.email"
        static let resetButton = "auth.reset.button"
        static let resetSuccess = "auth.reset.success"
        static let resetBack = "auth.reset.back"
        
        static let twoFATitle = "auth.2fa.title"
        static let twoFASubtitle = "auth.2fa.subtitle"
        static let twoFACode = "auth.2fa.code"
        static let twoFAVerify = "auth.2fa.verify"
        static let twoFAError = "auth.2fa.error"
        
        static let logout = "auth.logout"
        static let logoutConfirm = "auth.logout.confirm"
    }
    
    // MARK: - Dashboard
    struct Dashboard {
        static let title = "dashboard.title"
        static let welcome = "dashboard.welcome"
        static let portfolioTitle = "dashboard.portfolio.title"
        static let portfolioValue = "dashboard.portfolio.value"
        static let portfolioReturns = "dashboard.portfolio.returns"
        static let portfolioYTD = "dashboard.portfolio.ytd"
        static let portfolioMonthly = "dashboard.portfolio.monthly"
        static let portfolioPending = "dashboard.portfolio.pending"
        
        static let quickActions = "dashboard.quickactions"
        static let quickActionsWithdraw = "dashboard.quickactions.withdraw"
        static let quickActionsDocuments = "dashboard.quickactions.documents"
        static let quickActionsStatements = "dashboard.quickactions.statements"
        static let quickActionsSupport = "dashboard.quickactions.support"
        
        static let recentTitle = "dashboard.recent.title"
        static let recentEmpty = "dashboard.recent.empty"
        static let recentViewAll = "dashboard.recent.viewall"
        
        static let performanceTitle = "dashboard.performance.title"
        static let performance1M = "dashboard.performance.1m"
        static let performance3M = "dashboard.performance.3m"
        static let performance6M = "dashboard.performance.6m"
        static let performance1Y = "dashboard.performance.1y"
        static let performanceAll = "dashboard.performance.all"
    }
    
    // MARK: - Portfolio
    struct Portfolio {
        static let title = "portfolio.title"
        static let holdings = "portfolio.holdings"
        static let allocation = "portfolio.allocation"
        static let performance = "portfolio.performance"
        static let transactions = "portfolio.transactions"
        
        static let assetName = "portfolio.asset.name"
        static let assetBalance = "portfolio.asset.balance"
        static let assetValue = "portfolio.asset.value"
        static let assetChange = "portfolio.asset.change"
        static let assetAllocation = "portfolio.asset.allocation"
        
        static let transactionType = "portfolio.transaction.type"
        static let transactionAmount = "portfolio.transaction.amount"
        static let transactionDate = "portfolio.transaction.date"
        static let transactionStatus = "portfolio.transaction.status"
        static let transactionDeposit = "portfolio.transaction.deposit"
        static let transactionWithdrawal = "portfolio.transaction.withdrawal"
        static let transactionYield = "portfolio.transaction.yield"
        static let transactionFee = "portfolio.transaction.fee"
    }
    
    // MARK: - Documents
    struct Documents {
        static let title = "documents.title"
        static let statements = "documents.statements"
        static let tax = "documents.tax"
        static let agreements = "documents.agreements"
        static let reports = "documents.reports"
        static let empty = "documents.empty"
        static let download = "documents.download"
        static let view = "documents.view"
        static let share = "documents.share"
        
        static let statementMonthly = "documents.statement.monthly"
        static let statementAnnual = "documents.statement.annual"
        static let tax1099 = "documents.tax.1099"
        static let taxK1 = "documents.tax.k1"
    }
    
    // MARK: - Withdrawals
    struct Withdrawal {
        static let title = "withdrawal.title"
        static let request = "withdrawal.request"
        static let amount = "withdrawal.amount"
        static let available = "withdrawal.available"
        static let minimum = "withdrawal.minimum"
        static let maximum = "withdrawal.maximum"
        static let bank = "withdrawal.bank"
        static let processing = "withdrawal.processing"
        static let submit = "withdrawal.submit"
        static let history = "withdrawal.history"
        static let pending = "withdrawal.pending"
        static let completed = "withdrawal.completed"
        static let cancelled = "withdrawal.cancelled"
        
        static let confirmTitle = "withdrawal.confirm.title"
        static let confirmAmount = "withdrawal.confirm.amount"
        static let confirmFee = "withdrawal.confirm.fee"
        static let confirmTotal = "withdrawal.confirm.total"
        static let confirmButton = "withdrawal.confirm.button"
        
        static let success = "withdrawal.success"
        static let errorInsufficient = "withdrawal.error.insufficient"
        static let errorMinimum = "withdrawal.error.minimum"
        static let errorMaximum = "withdrawal.error.maximum"
    }
    
    // MARK: - Support
    struct Support {
        static let title = "support.title"
        static let contact = "support.contact"
        static let faq = "support.faq"
        static let help = "support.help"
        static let tickets = "support.tickets"
        static let new = "support.new"
        
        static let ticketSubject = "support.ticket.subject"
        static let ticketMessage = "support.ticket.message"
        static let ticketPriority = "support.ticket.priority"
        static let ticketPriorityLow = "support.ticket.priority.low"
        static let ticketPriorityMedium = "support.ticket.priority.medium"
        static let ticketPriorityHigh = "support.ticket.priority.high"
        static let ticketStatusOpen = "support.ticket.status.open"
        static let ticketStatusPending = "support.ticket.status.pending"
        static let ticketStatusResolved = "support.ticket.status.resolved"
        static let ticketStatusClosed = "support.ticket.status.closed"
        
        static let email = "support.email"
        static let phone = "support.phone"
        static let hours = "support.hours"
    }
    
    // MARK: - Settings
    struct Settings {
        static let title = "settings.title"
        static let profile = "settings.profile"
        static let security = "settings.security"
        static let notifications = "settings.notifications"
        static let preferences = "settings.preferences"
        static let legal = "settings.legal"
        static let about = "settings.about"
        
        static let profileName = "settings.profile.name"
        static let profileEmail = "settings.profile.email"
        static let profilePhone = "settings.profile.phone"
        static let profileAddress = "settings.profile.address"
        static let profileTaxID = "settings.profile.taxid"
        static let profileEdit = "settings.profile.edit"
        static let profileSave = "settings.profile.save"
        
        static let securityPassword = "settings.security.password"
        static let security2FA = "settings.security.2fa"
        static let securityBiometric = "settings.security.biometric"
        static let securitySessions = "settings.security.sessions"
        static let securityDevices = "settings.security.devices"
        
        static let notificationsPush = "settings.notifications.push"
        static let notificationsEmail = "settings.notifications.email"
        static let notificationsSMS = "settings.notifications.sms"
        static let notificationsTransactions = "settings.notifications.transactions"
        static let notificationsStatements = "settings.notifications.statements"
        static let notificationsMarketing = "settings.notifications.marketing"
        
        static let preferencesTheme = "settings.preferences.theme"
        static let preferencesThemeLight = "settings.preferences.theme.light"
        static let preferencesThemeDark = "settings.preferences.theme.dark"
        static let preferencesThemeSystem = "settings.preferences.theme.system"
        static let preferencesCurrency = "settings.preferences.currency"
        static let preferencesLanguage = "settings.preferences.language"
        
        static let legalTerms = "settings.legal.terms"
        static let legalPrivacy = "settings.legal.privacy"
        static let legalDisclosures = "settings.legal.disclosures"
        
        static let aboutVersion = "settings.about.version"
        static let aboutBuild = "settings.about.build"
        static let aboutCopyright = "settings.about.copyright"
    }
    
    // MARK: - Admin
    struct Admin {
        static let title = "admin.title"
        static let investors = "admin.investors"
        static let operations = "admin.operations"
        static let reports = "admin.reports"
        static let settings = "admin.settings"
        
        static let investorList = "admin.investor.list"
        static let investorAdd = "admin.investor.add"
        static let investorEdit = "admin.investor.edit"
        static let investorDetails = "admin.investor.details"
        static let investorStatus = "admin.investor.status"
        static let investorStatusActive = "admin.investor.status.active"
        static let investorStatusPending = "admin.investor.status.pending"
        static let investorStatusSuspended = "admin.investor.status.suspended"
        
        static let operationsDeposits = "admin.operations.deposits"
        static let operationsWithdrawals = "admin.operations.withdrawals"
        static let operationsYield = "admin.operations.yield"
        static let operationsStatements = "admin.operations.statements"
        
        static let reportsPortfolio = "admin.reports.portfolio"
        static let reportsTransactions = "admin.reports.transactions"
        static let reportsAudit = "admin.reports.audit"
        static let reportsExport = "admin.reports.export"
    }
    
    // MARK: - Errors
    struct Error {
        static let network = "error.network"
        static let server = "error.server"
        static let unauthorized = "error.unauthorized"
        static let sessionExpired = "error.session.expired"
        static let unknown = "error.unknown"
        static let dataLoading = "error.data.loading"
        static let dataSave = "error.data.save"
    }
    
    // MARK: - Success
    struct Success {
        static let profileUpdated = "success.profile.updated"
        static let passwordChanged = "success.password.changed"
        static let settingsSaved = "success.settings.saved"
        static let documentDownloaded = "success.document.downloaded"
        static let ticketSubmitted = "success.ticket.submitted"
    }
    
    // MARK: - Accessibility
    struct Accessibility {
        static let buttonBack = "accessibility.button.back"
        static let buttonMenu = "accessibility.button.menu"
        static let buttonClose = "accessibility.button.close"
        static let imageProfile = "accessibility.image.profile"
        static let chartPerformance = "accessibility.chart.performance"
        static let listTransactions = "accessibility.list.transactions"
    }
    
    // MARK: - Plurals
    struct Plurals {
        static let transactionsCount = "transactions.count"
        static let documentsCount = "documents.count"
        static let daysRemaining = "days.remaining"
        static let investorsCount = "investors.count"
    }
}
