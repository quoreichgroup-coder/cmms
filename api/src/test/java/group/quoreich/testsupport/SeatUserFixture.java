package group.quoreich.testsupport;

import jakarta.persistence.*;

/** Kept outside application entity scanning; used only by the isolated seat integration context. */
@Entity(name = "SeatUserFixture")
@Table(name = "own_user")
public class SeatUserFixture {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seat_user_fixture")
    @SequenceGenerator(name = "seat_user_fixture", sequenceName = "own_user_id_seq", allocationSize = 1)
    Long id;
    boolean enabled = true;
    @Column(name = "role_id") Long roleId = 1L;
    @Column(name = "company_id") Long companyId = 1L;
}
