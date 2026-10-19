<?php

namespace App\Notifications;

use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\URL;

class CustomerVerifyEmailNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * Delete the job if the target model has already been deleted.
     */
    public bool $deleteWhenMissingModels = true;

    /**
     * Create a new notification instance.
     */
    public function __construct(
        public ?string $verificationUrl = null,
        public ?string $rawToken = null,
        public ?int $expiresInMinutes = null
    ) {
        $this->afterCommit();
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /**
     * Build the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $verificationUrl = $this->verificationUrl ?: $this->defaultVerificationUrl($notifiable);
        $expiresInMinutes = $this->expiresInMinutes ?: (int) Config::get('auth.verification.expire', 60);

        return (new MailMessage)
            ->subject('Verify your AYAAN CLOTHING account')
            ->view('emails.auth.verify-email', [
                'recipientName' => $notifiable->name ?? 'Valued Customer',
                'verificationUrl' => $verificationUrl,
                'expiresInMinutes' => $expiresInMinutes,
                'supportEmail' => config('mail.support_address', 'support@ayaanclothing.com'),
            ])
            ->text('emails.auth.verify-email-text', [
                'recipientName' => $notifiable->name ?? 'Valued Customer',
                'verificationUrl' => $verificationUrl,
                'expiresInMinutes' => $expiresInMinutes,
                'supportEmail' => config('mail.support_address', 'support@ayaanclothing.com'),
            ]);
    }

    /**
     * Generate the default fallback signed verification URL for the given notifiable.
     */
    protected function defaultVerificationUrl(object $notifiable): string
    {
        $params = [
            'id' => $notifiable->getKey(),
            'hash' => sha1($notifiable->getEmailForVerification()),
        ];

        if ($this->rawToken) {
            $params['token'] = $this->rawToken;
        }

        return URL::temporarySignedRoute(
            'verification.verify',
            Carbon::now()->addMinutes($this->expiresInMinutes ?: (int) Config::get('auth.verification.expire', 60)),
            $params
        );
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'email_verification',
            'user_id' => $notifiable->getKey(),
            'email' => $notifiable->getEmailForVerification(),
        ];
    }
}
